-- Leki: powiadomienia push (docs/PLAN.md §8, PROJEKT.md §7).
--
-- Przepływ: pg_cron co 15 min → public.invoke_notify() → pg_net → Edge Function `notify`
-- → public.notification_candidates() → web-push → notification_log.
--
-- Przed pierwszym uruchomieniem zapisać w Vault (SQL Editor), wartości bez cudzysłowów w repo:
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/notify', 'notify_url');
--   select vault.create_secret('<ten sam NOTIFY_SECRET co w sekretach Edge Function>', 'notify_secret');
-- Bez nich invoke_notify() tylko zgłasza ostrzeżenie.

-- ───────────────────────────── Subskrypcje ─────────────────────────────

-- Subskrypcja należy do urządzenia (endpoint jest unikalny). Gdy na tym samym telefonie
-- zaloguje się ktoś inny, subskrypcja przechodzi na niego; zwykły upsert odrzuciłby to RLS.
create function public.register_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Brak sesji' using errcode = '42501';
  end if;
  if p_endpoint is null or p_endpoint !~ '^https://' or coalesce(p_p256dh, '') = '' or coalesce(p_auth, '') = '' then
    raise exception 'Niepoprawna subskrypcja' using errcode = '22023';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (v_uid, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh  = excluded.p256dh,
        auth    = excluded.auth;
end;
$$;

-- ───────────────────────────── Kandydaci do wysłania ─────────────────────────────

-- Wszystko, co należy teraz wysłać, dla wszystkich użytkowników z subskrypcją.
-- Czas w Europe/Warsaw. Pomija pozycje już zapisane w notification_log.
--   slot_missed  minęła reminder_time aktywnej pory i są w niej nieodhaczone dawki,
--   exact_time   minęła exact_time dawki i dawka nie jest odhaczona,
--   low_stock    od 9:00, zapas ≤ próg, low_stock_notified_at puste.
-- Prognoza zapasu jak w src/lib/domain/forecast.ts: dzień po dniu przez 400 dni, z przyszłymi
-- okresami, bez dawek odhaczonych dziś; opakowanie kończy się w dniu, w którym narastające
-- zużycie przekracza stan. Liczy się najsłabsze opakowanie leku.
create function public.notification_candidates(p_now timestamptz default now())
returns table (user_id uuid, kind text, ref_id uuid, date date, info jsonb)
language sql
stable
security invoker
set search_path = ''
as $$
  with clock as (
    select (p_now at time zone 'Europe/Warsaw')::date as today,
           (p_now at time zone 'Europe/Warsaw')::time as now_time
  ),
  subscribed as (
    select distinct ps.user_id from public.push_subscriptions ps
  ),
  meds as (
    select m.*
      from public.medications m
      join subscribed s on s.user_id = m.user_id
     where not m.is_archived
  ),
  today_doses as (
    select m.user_id, m.name as med_name, d.id as dose_id, d.slot_id, d.exact_time, d.sort_order, c.today,
           c.now_time,
           exists (select 1 from public.intake_log l where l.period_dose_id = d.id and l.date = c.today) as taken
      from clock c
      cross join meds m
      join public.dosing_periods p
        on p.medication_id = m.id
       and p.valid_from <= c.today
       and (p.valid_to is null or p.valid_to >= c.today)
      join public.period_doses d on d.period_id = p.id
  ),
  slot_missed as (
    select td.user_id, 'slot_missed'::text as kind, ts.id as ref_id, td.today as date,
           jsonb_build_object(
             'slot', ts.name,
             'count', count(*),
             'meds', jsonb_agg(td.med_name order by td.sort_order, td.med_name)
           ) as info
      from today_doses td
      join public.time_slots ts on ts.id = td.slot_id
     where not td.taken
       and ts.is_active
       and ts.reminder_time is not null
       and ts.reminder_time <= td.now_time
     group by td.user_id, ts.id, ts.name, td.today
  ),
  exact_time as (
    select td.user_id, 'exact_time'::text, td.dose_id, td.today,
           jsonb_build_object(
             'med', td.med_name,
             'time', to_char(td.exact_time, 'HH24:MI'),
             'slot', ts.name,
             'parts', (
               select coalesce(jsonb_agg(jsonb_build_object(
                        'quantity', part.quantity,
                        'strength', pkg.strength_value,
                        'unit', pkg.strength_unit)), '[]'::jsonb)
                 from public.period_dose_parts part
                 join public.med_packages pkg on pkg.id = part.package_id
                where part.period_dose_id = td.dose_id
             )
           )
      from today_doses td
      join public.time_slots ts on ts.id = td.slot_id
     where not td.taken
       and td.exact_time is not null
       and td.exact_time <= td.now_time
  ),
  stock_meds as (
    select m.*
      from meds m, clock c
     where m.low_stock_notified_at is null
       and c.now_time >= time '09:00'
  ),
  horizon as (
    select c.today + i as day
      from clock c, generate_series(0, 399) as i
  ),
  need as (
    select part.package_id, h.day, sum(part.quantity) as qty
      from stock_meds m
      cross join clock c
      join public.dosing_periods p on p.medication_id = m.id
      join horizon h on h.day >= p.valid_from and (p.valid_to is null or h.day <= p.valid_to)
      join public.period_doses d on d.period_id = p.id
      join public.period_dose_parts part on part.period_dose_id = d.id
     where not (
       h.day = c.today
       and exists (select 1 from public.intake_log l where l.period_dose_id = d.id and l.date = c.today)
     )
     group by part.package_id, h.day
  ),
  running as (
    select n.package_id, n.day, sum(n.qty) over (partition by n.package_id order by n.day) as total
      from need n
  ),
  package_end as (
    select pkg.medication_id,
           (select min(r.day) from running r where r.package_id = pkg.id and r.total > pkg.stock_cached) - 1
             as last_day
      from public.med_packages pkg
     where pkg.medication_id in (select id from stock_meds)
  ),
  weakest as (
    select pe.medication_id, min(pe.last_day) as last_day
      from package_end pe
     where pe.last_day is not null
     group by pe.medication_id
  ),
  low_stock as (
    select m.user_id, 'low_stock'::text, m.id, c.today,
           jsonb_build_object(
             'med', m.name,
             'last_day', w.last_day,
             'days_left', greatest(0, w.last_day - c.today + 1)
           )
      from weakest w
      join stock_meds m on m.id = w.medication_id
      join public.profiles pr on pr.id = m.user_id
      cross join clock c
     where greatest(0, w.last_day - c.today + 1) <= coalesce(m.low_stock_days, pr.low_stock_days)
  ),
  candidates as (
    select * from slot_missed
    union all select * from exact_time
    union all select * from low_stock
  )
  select x.user_id, x.kind, x.ref_id, x.date, x.info
    from candidates x
   where not exists (
     select 1 from public.notification_log nl
      where nl.kind = x.kind and nl.ref_id = x.ref_id and nl.date = x.date
   );
$$;

-- ───────────────────────────── Harmonogram ─────────────────────────────

-- Adres funkcji i wspólny sekret są w Vault, nie w repozytorium.
create function public.invoke_notify()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'notify_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'notify_secret';
  if v_url is null or v_secret is null then
    raise warning 'invoke_notify: brak sekretów notify_url / notify_secret w Vault';
    return null;
  end if;

  return net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
end;
$$;

-- ───────────────────────────── Uprawnienia ─────────────────────────────

revoke execute on function public.register_push_subscription(text, text, text) from public, anon;
grant execute on function public.register_push_subscription(text, text, text) to authenticated;

-- Kandydatów czyta tylko Edge Function (service role); invoke_notify wywołuje tylko pg_cron.
revoke execute on function public.notification_candidates(timestamptz) from public, anon, authenticated;
grant execute on function public.notification_candidates(timestamptz) to service_role;
revoke execute on function public.invoke_notify() from public, anon, authenticated;

-- Co 15 minut (cron.schedule z tą samą nazwą nadpisuje harmonogram).
select cron.schedule('leki-notify', '*/15 * * * *', 'select public.invoke_notify()');
