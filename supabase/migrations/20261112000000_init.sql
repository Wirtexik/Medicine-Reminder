-- Leki: schemat początkowy (docs/PROJEKT.md §6, docs/PLAN.md §2).
-- Konwencje:
--   * wszystkie daty kalendarzowe w strefie Europe/Warsaw,
--   * tabele z user_id mają DEFAULT auth.uid(), więc klient nie musi go podawać,
--   * funkcje: SET search_path = '' i pełne nazwy obiektów.

-- ───────────────────────────── Rozszerzenia ─────────────────────────────

create extension if not exists btree_gist with schema extensions;  -- EXCLUDE na okresach
create extension if not exists pg_net with schema extensions;       -- Edge Function z pg_cron (p. 8)
create extension if not exists pg_cron with schema pg_catalog;      -- harmonogram powiadomień (p. 8)

-- ───────────────────────────── Tabele ─────────────────────────────

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  username       text not null,
  low_stock_days integer not null default 7 check (low_stock_days > 0),
  timezone       text not null default 'Europe/Warsaw',
  created_at     timestamptz not null default now()
);

create table public.time_slots (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (length(trim(name)) > 0),
  sort_order    integer not null,
  reminder_time time,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index time_slots_user_idx on public.time_slots (user_id, sort_order);

create table public.medications (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name                  text not null check (length(trim(name)) > 0),
  form                  text not null check (form in ('tablet', 'capsule', 'drops', 'syrup')),
  description           text not null default '',
  low_stock_days        integer check (low_stock_days > 0),  -- null → profiles.low_stock_days
  low_stock_notified_at timestamptz,
  is_archived           boolean not null default false,
  created_at            timestamptz not null default now()
);
create index medications_user_idx on public.medications (user_id);

create table public.med_packages (
  id             uuid primary key default gen_random_uuid(),
  medication_id  uuid not null references public.medications (id) on delete cascade,
  strength_value numeric not null check (strength_value > 0),
  strength_unit  text not null check (strength_unit in ('mg', 'µg', 'ml', 'krople')),
  unit_label     text not null check (unit_label in ('tabl.', 'kaps.', 'ml', 'krople')),
  package_size   numeric not null check (package_size > 0),
  stock_cached   numeric not null default 0,  -- utrzymywane triggerem z stock_movements
  created_at     timestamptz not null default now()
);
create index med_packages_medication_idx on public.med_packages (medication_id);

create table public.dosing_periods (
  id            uuid primary key default gen_random_uuid(),
  medication_id uuid not null references public.medications (id) on delete cascade,
  valid_from    date not null,
  valid_to      date,
  created_at    timestamptz not null default now(),
  constraint dosing_periods_range_chk check (valid_to is null or valid_to >= valid_from),
  constraint dosing_periods_no_overlap exclude using gist (
    medication_id with =,
    daterange(valid_from, valid_to, '[]') with &&
  )
);

create table public.period_doses (
  id         uuid primary key default gen_random_uuid(),
  period_id  uuid not null references public.dosing_periods (id) on delete cascade,
  slot_id    uuid not null references public.time_slots (id) on delete restrict,
  exact_time time,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index period_doses_period_idx on public.period_doses (period_id);
create index period_doses_slot_idx on public.period_doses (slot_id);

create table public.period_dose_parts (
  id             uuid primary key default gen_random_uuid(),
  period_dose_id uuid not null references public.period_doses (id) on delete cascade,
  package_id     uuid not null references public.med_packages (id) on delete restrict,
  quantity       numeric not null check (quantity > 0),
  unique (period_dose_id, package_id)
);
create index period_dose_parts_package_idx on public.period_dose_parts (package_id);

-- Historia przyjęć jest chroniona: dawki z wpisami nie da się usunąć
-- (zmiana dawkowania = nowy okres, lek = archiwizacja).
create table public.intake_log (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  period_dose_id uuid not null references public.period_doses (id) on delete restrict,
  date           date not null,
  taken_at       timestamptz not null default now(),
  unique (period_dose_id, date)
);
create index intake_log_user_date_idx on public.intake_log (user_id, date);

create table public.stock_movements (
  id            uuid primary key default gen_random_uuid(),
  package_id    uuid not null references public.med_packages (id) on delete cascade,
  delta         numeric not null check (delta <> 0),
  reason        text not null check (reason in ('intake', 'purchase', 'correction')),
  intake_log_id uuid references public.intake_log (id) on delete cascade,
  created_at    timestamptz not null default now(),
  constraint stock_movements_intake_link_chk check ((reason = 'intake') = (intake_log_id is not null))
);
create index stock_movements_package_idx on public.stock_movements (package_id);
create index stock_movements_intake_idx on public.stock_movements (intake_log_id);

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create table public.notification_log (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind    text not null check (kind in ('slot_missed', 'exact_time', 'low_stock')),
  ref_id  uuid not null,  -- time_slots.id | period_doses.id | medications.id
  date    date not null,
  sent_at timestamptz not null default now(),
  unique (kind, ref_id, date)
);

-- ───────────────────────────── Funkcje pomocnicze ─────────────────────────────

create function public.warsaw_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Warsaw')::date;
$$;

-- Edytować można tylko dziś i wczoraj (PROJEKT.md §5.4).
create function public.assert_editable_date(p_date date)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_today date := public.warsaw_today();
begin
  if p_date is null or p_date > v_today or p_date < v_today - 1 then
    raise exception 'Dzień % nie jest edytowalny', p_date
      using errcode = '22023', hint = 'date_not_editable';
  end if;
end;
$$;

-- ───────────────────────────── Triggery ─────────────────────────────

-- Nowe konto: profil + 7 domyślnych pór dnia (src/lib/data/demo.ts → DEFAULT_SLOTS).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(coalesce(new.email, new.id::text), '@', 1));

  insert into public.time_slots (user_id, name, sort_order, reminder_time)
  values
    (new.id, 'Przed śniadaniem', 1, '12:00'),
    (new.id, 'Po śniadaniu',     2, '12:00'),
    (new.id, 'Przed obiadem',    3, '17:00'),
    (new.id, 'Po obiedzie',      4, '17:00'),
    (new.id, 'Przed kolacją',    5, '23:00'),
    (new.id, 'Po kolacji',       6, '23:00'),
    (new.id, 'Na noc',           7, '23:00');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Stan opakowania = suma ruchów. SECURITY DEFINER, bo ruchy usuwane kaskadowo
-- (cofnięcie odhaczenia) też muszą przeliczyć stan.
create function public.recalc_package_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pkg uuid;
begin
  foreach v_pkg in array array[
    case when tg_op <> 'INSERT' then old.package_id end,
    case when tg_op <> 'DELETE' then new.package_id end
  ] loop
    if v_pkg is not null then
      update public.med_packages
         set stock_cached = coalesce(
               (select sum(m.delta) from public.stock_movements m where m.package_id = v_pkg), 0)
       where id = v_pkg;
    end if;
  end loop;
  return null;
end;
$$;

create trigger stock_movements_recalc
  after insert or update or delete on public.stock_movements
  for each row execute function public.recalc_package_stock();

-- Pora dawki musi należeć do właściciela leku.
create function public.check_period_dose()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
      from public.dosing_periods p
      join public.medications m on m.id = p.medication_id
      join public.time_slots s on s.user_id = m.user_id
     where p.id = new.period_id and s.id = new.slot_id
  ) then
    raise exception 'Pora dnia nie należy do właściciela leku' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger period_doses_check
  before insert or update of period_id, slot_id on public.period_doses
  for each row execute function public.check_period_dose();

-- Składnik dawki musi pochodzić z opakowania tego samego leku.
create function public.check_period_dose_part()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
      from public.period_doses d
      join public.dosing_periods p on p.id = d.period_id
      join public.med_packages pkg on pkg.medication_id = p.medication_id
     where d.id = new.period_dose_id and pkg.id = new.package_id
  ) then
    raise exception 'Opakowanie nie należy do tego leku' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger period_dose_parts_check
  before insert or update of period_dose_id, package_id on public.period_dose_parts
  for each row execute function public.check_period_dose_part();

-- Strażnik daty dla intake_log. Dotyczy tylko zalogowanego użytkownika;
-- operacje administracyjne (np. usunięcie konta) przechodzą.
create function public.guard_intake_date()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    if tg_op in ('UPDATE', 'DELETE') then
      perform public.assert_editable_date(old.date);
    end if;
    if tg_op in ('INSERT', 'UPDATE') then
      perform public.assert_editable_date(new.date);
    end if;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger intake_log_guard
  before insert or update or delete on public.intake_log
  for each row execute function public.guard_intake_date();

-- ───────────────────────────── RLS ─────────────────────────────

alter table public.profiles           enable row level security;
alter table public.time_slots         enable row level security;
alter table public.medications        enable row level security;
alter table public.med_packages       enable row level security;
alter table public.dosing_periods     enable row level security;
alter table public.period_doses       enable row level security;
alter table public.period_dose_parts  enable row level security;
alter table public.intake_log         enable row level security;
alter table public.stock_movements    enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_log   enable row level security;

create policy "own profile: read" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "own profile: update" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own rows" on public.time_slots
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own rows" on public.medications
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "via medication" on public.med_packages
  for all to authenticated
  using (exists (select 1 from public.medications m
                  where m.id = medication_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.medications m
                       where m.id = medication_id and m.user_id = (select auth.uid())));

create policy "via medication" on public.dosing_periods
  for all to authenticated
  using (exists (select 1 from public.medications m
                  where m.id = medication_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.medications m
                       where m.id = medication_id and m.user_id = (select auth.uid())));

create policy "via medication" on public.period_doses
  for all to authenticated
  using (exists (select 1 from public.dosing_periods p
                   join public.medications m on m.id = p.medication_id
                  where p.id = period_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.dosing_periods p
                        join public.medications m on m.id = p.medication_id
                       where p.id = period_id and m.user_id = (select auth.uid())));

create policy "via medication" on public.period_dose_parts
  for all to authenticated
  using (exists (select 1 from public.period_doses d
                   join public.dosing_periods p on p.id = d.period_id
                   join public.medications m on m.id = p.medication_id
                  where d.id = period_dose_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.period_doses d
                        join public.dosing_periods p on p.id = d.period_id
                        join public.medications m on m.id = p.medication_id
                       where d.id = period_dose_id and m.user_id = (select auth.uid())));

create policy "own rows" on public.intake_log
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.period_doses d
                  join public.dosing_periods p on p.id = d.period_id
                  join public.medications m on m.id = p.medication_id
                 where d.id = period_dose_id and m.user_id = (select auth.uid()))
  );

create policy "via medication" on public.stock_movements
  for all to authenticated
  using (exists (select 1 from public.med_packages pkg
                   join public.medications m on m.id = pkg.medication_id
                  where pkg.id = package_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.med_packages pkg
                        join public.medications m on m.id = pkg.medication_id
                       where pkg.id = package_id and m.user_id = (select auth.uid())));

create policy "own rows" on public.push_subscriptions
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Zapisuje tylko Edge Function (service role, omija RLS).
create policy "own rows: read" on public.notification_log
  for select to authenticated using (user_id = (select auth.uid()));

-- Dostęp przez Data API: tylko zalogowani.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ───────────────────────────── RPC ─────────────────────────────
-- SECURITY INVOKER: działają w ramach RLS wywołującego. Każde wywołanie to jedna transakcja.

create function public.take_dose(p_dose_id uuid, p_date date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_log_id uuid;
begin
  perform public.assert_editable_date(p_date);

  if not exists (
    select 1
      from public.period_doses d
      join public.dosing_periods p on p.id = d.period_id
     where d.id = p_dose_id
       and p_date >= p.valid_from
       and (p.valid_to is null or p_date <= p.valid_to)
  ) then
    raise exception 'Dawka nie obowiązuje w dniu %', p_date
      using errcode = '22023', hint = 'dose_not_active';
  end if;

  insert into public.intake_log (user_id, period_dose_id, date)
  values ((select auth.uid()), p_dose_id, p_date)
  on conflict (period_dose_id, date) do nothing
  returning id into v_log_id;

  if v_log_id is null then
    return;  -- już odhaczona: idempotentnie
  end if;

  insert into public.stock_movements (package_id, delta, reason, intake_log_id)
  select part.package_id, -part.quantity, 'intake', v_log_id
    from public.period_dose_parts part
   where part.period_dose_id = p_dose_id;
end;
$$;

-- Usunięcie wpisu kaskadowo usuwa ruchy (−), trigger przelicza stan.
create function public.untake_dose(p_dose_id uuid, p_date date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform public.assert_editable_date(p_date);
  delete from public.intake_log
   where period_dose_id = p_dose_id and date = p_date;
end;
$$;

create function public.take_slot(p_dose_ids uuid[], p_date date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  foreach v_id in array coalesce(p_dose_ids, '{}') loop
    perform public.take_dose(v_id, p_date);
  end loop;
end;
$$;

-- Kolejność = pozycja w tablicy (1..n), jak w StoreProvider.reorder.
create function public.reorder_doses(p_dose_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.period_doses d
     set sort_order = o.ord
    from unnest(p_dose_ids) with ordinality as o(id, ord)
   where d.id = o.id;
$$;

-- „Od dnia X nowe dawkowanie”: bieżący okres kończy się X−1, nowy zaczyna się X
-- z kopią dawek (łącznie z kolejnością). Zwraca id nowego okresu.
create function public.start_new_period(p_medication_id uuid, p_from date)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_src      public.dosing_periods%rowtype;
  v_has_src  boolean;
  v_to       date;
  v_new_id   uuid;
  v_dose     public.period_doses%rowtype;
  v_new_dose uuid;
begin
  if p_from is null then
    raise exception 'Brak daty początku' using errcode = '22023';
  end if;

  if not exists (select 1 from public.medications where id = p_medication_id) then
    raise exception 'Nie znaleziono leku' using errcode = 'P0002';
  end if;

  -- Okres źródłowy: ostatni zaczynający się nie później niż X.
  select * into v_src
    from public.dosing_periods
   where medication_id = p_medication_id and valid_from <= p_from
   order by valid_from desc
   limit 1;
  v_has_src := found;

  if v_has_src and v_src.valid_from = p_from then
    raise exception 'Okres od % już istnieje', p_from
      using errcode = '23P01', hint = 'period_exists';
  end if;

  if v_has_src and (v_src.valid_to is null or v_src.valid_to >= p_from) then
    -- X wypada w trakcie okresu: przyjęcia od X należałyby do nowego okresu.
    if exists (
      select 1 from public.intake_log l
        join public.period_doses d on d.id = l.period_dose_id
       where d.period_id = v_src.id and l.date >= p_from
    ) then
      raise exception 'Od % są już odhaczone dawki', p_from
        using errcode = '22023', hint = 'has_intakes';
    end if;

    v_to := v_src.valid_to;
    update public.dosing_periods set valid_to = p_from - 1 where id = v_src.id;
  else
    -- X w luce: nowy okres kończy się przed następnym.
    select min(valid_from) - 1 into v_to
      from public.dosing_periods
     where medication_id = p_medication_id and valid_from > p_from;
  end if;

  insert into public.dosing_periods (medication_id, valid_from, valid_to)
  values (p_medication_id, p_from, v_to)
  returning id into v_new_id;

  if v_has_src then
    for v_dose in
      select * from public.period_doses where period_id = v_src.id order by sort_order
    loop
      insert into public.period_doses (period_id, slot_id, exact_time, sort_order)
      values (v_new_id, v_dose.slot_id, v_dose.exact_time, v_dose.sort_order)
      returning id into v_new_dose;

      insert into public.period_dose_parts (period_dose_id, package_id, quantity)
      select v_new_dose, package_id, quantity
        from public.period_dose_parts
       where period_dose_id = v_dose.id;
    end loop;
  end if;

  return v_new_id;
end;
$$;

-- Uprawnienia do funkcji: domyślnie EXECUTE ma PUBLIC; zostawiamy tylko zalogowanym.
revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.warsaw_today(),
  public.take_dose(uuid, date),
  public.untake_dose(uuid, date),
  public.take_slot(uuid[], date),
  public.reorder_doses(uuid[]),
  public.start_new_period(uuid, date)
to authenticated;
-- assert_editable_date wywoływana z funkcji invoker i triggera intake_log.
grant execute on function public.assert_editable_date(date) to authenticated;
