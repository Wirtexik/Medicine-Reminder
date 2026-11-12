-- Leki: plan dawkowania z kilku etapów (np. 40 mg przez tydzień → 30 mg przez tydzień → 20 mg do wizyty).
-- Wymaga 20261112120000_meds_editing.sql (replace_period_doses).
--
-- Etapy (jsonb), w kolejności dat:
--   [{ "valid_from": date, "valid_to": date|null, "doses": [...] }]   -- doses jak w replace_period_doses

-- Zapisuje etapy jako kolejne okresy. Ogólna wersja start_new_period:
--   * okres trwający w dniu początku planu kończy się dzień wcześniej,
--   * okresy zaczynające się od dnia początku planu są zastępowane planem,
--   * odhaczenia od dnia początku blokują zmianę (has_intakes).
create function public.plan_periods(p_medication_id uuid, p_periods jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_from   date;
  v_stage  jsonb;
  v_period uuid;
begin
  if jsonb_typeof(coalesce(p_periods, 'null'::jsonb)) <> 'array' or jsonb_array_length(p_periods) = 0 then
    raise exception 'Plan bez etapów' using errcode = '22023';
  end if;

  if not exists (select 1 from public.medications where id = p_medication_id) then
    raise exception 'Nie znaleziono leku' using errcode = 'P0002';
  end if;

  select min((s->>'valid_from')::date) into v_from from jsonb_array_elements(p_periods) s;

  if exists (
    select 1
      from public.intake_log l
      join public.period_doses d on d.id = l.period_dose_id
      join public.dosing_periods p on p.id = d.period_id
     where p.medication_id = p_medication_id and l.date >= v_from
  ) then
    raise exception 'Od % są już odhaczone dawki', v_from using errcode = '22023', hint = 'has_intakes';
  end if;

  -- Bez odhaczeń od v_from, więc późniejsze okresy można bezpiecznie usunąć.
  delete from public.dosing_periods where medication_id = p_medication_id and valid_from >= v_from;
  update public.dosing_periods
     set valid_to = v_from - 1
   where medication_id = p_medication_id
     and valid_from < v_from
     and (valid_to is null or valid_to >= v_from);

  for v_stage in select * from jsonb_array_elements(p_periods) loop
    insert into public.dosing_periods (medication_id, valid_from, valid_to)
    values (p_medication_id, (v_stage->>'valid_from')::date, nullif(v_stage->>'valid_to', '')::date)
    returning id into v_period;
    perform public.replace_period_doses(v_period, v_stage->'doses');
  end loop;
end;
$$;

-- Kreator „Dodaj lek” przyjmuje teraz listę etapów (`periods`); `period` zostaje dla zgodności.
create or replace function public.create_medication(p jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_med     uuid;
  v_period  uuid;
  v_pkg     jsonb;
  v_pkg_id  uuid;
  v_pkg_ids uuid[] := '{}';
  v_stock   numeric;
  v_stage   jsonb;
  v_stages  jsonb;
begin
  if jsonb_array_length(coalesce(p->'packages', '[]'::jsonb)) = 0 then
    raise exception 'Lek musi mieć co najmniej jedno opakowanie' using errcode = '22023', hint = 'no_packages';
  end if;

  insert into public.medications (name, form, description, low_stock_days)
  values (
    trim(p->>'name'),
    p->>'form',
    coalesce(p->>'description', ''),
    nullif(p->>'low_stock_days', '')::int
  )
  returning id into v_med;

  for v_pkg in select * from jsonb_array_elements(p->'packages') loop
    insert into public.med_packages (medication_id, strength_value, strength_unit, unit_label, package_size)
    values (
      v_med,
      (v_pkg->>'strength_value')::numeric,
      v_pkg->>'strength_unit',
      v_pkg->>'unit_label',
      (v_pkg->>'package_size')::numeric
    )
    returning id into v_pkg_id;
    v_pkg_ids := v_pkg_ids || v_pkg_id;

    v_stock := coalesce(nullif(v_pkg->>'stock', '')::numeric, 0);
    if v_stock <> 0 then
      insert into public.stock_movements (package_id, delta, reason)
      values (v_pkg_id, v_stock, 'correction');
    end if;
  end loop;

  v_stages := case
    when jsonb_typeof(p->'periods') = 'array' then p->'periods'
    when jsonb_typeof(p->'period') = 'object' then jsonb_build_array(p->'period')
    else '[]'::jsonb
  end;

  for v_stage in select * from jsonb_array_elements(v_stages) loop
    insert into public.dosing_periods (medication_id, valid_from, valid_to)
    values (v_med, (v_stage->>'valid_from')::date, nullif(v_stage->>'valid_to', '')::date)
    returning id into v_period;
    perform public.replace_period_doses(v_period, v_stage->'doses', v_pkg_ids);
  end loop;

  return v_med;
end;
$$;

revoke execute on function public.plan_periods(uuid, jsonb) from public, anon;
grant execute on function public.plan_periods(uuid, jsonb) to authenticated;
