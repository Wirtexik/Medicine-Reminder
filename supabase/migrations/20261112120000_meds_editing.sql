-- Leki: zapis leków, opakowań i okresów dawkowania (docs/PLAN.md §5).
-- Zapisy obejmujące kilka tabel idą przez funkcje, żeby wykonały się w jednej transakcji.
-- Wszystkie funkcje: SECURITY INVOKER (działa RLS wywołującego), SET search_path = ''.
--
-- Format dawek (jsonb), wspólny dla create_medication i save_period:
--   [{ "id": uuid|null, "slot_id": uuid, "exact_time": "HH:mm"|null,
--      "parts": [{ "package_id": uuid } | { "package_index": int (od 0), "quantity": numeric }] }]
-- package_index wskazuje opakowanie tworzone w tym samym wywołaniu (kreator nowego leku).

-- Zastępuje dawki okresu podanymi. Dawki z id są aktualizowane, bez id dodawane,
-- a pominięte usuwane (chyba że mają historię przyjęć).
create function public.replace_period_doses(p_period_id uuid, p_doses jsonb, p_package_ids uuid[] default '{}')
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_dose    jsonb;
  v_part    jsonb;
  v_dose_id uuid;
  v_pkg_id  uuid;
  v_qty     numeric;
  v_keep    uuid[];
begin
  if jsonb_typeof(coalesce(p_doses, 'null'::jsonb)) <> 'array' then
    raise exception 'Brak listy dawek' using errcode = '22023';
  end if;

  select coalesce(array_agg((d->>'id')::uuid), '{}')
    into v_keep
    from jsonb_array_elements(p_doses) d
   where nullif(d->>'id', '') is not null;

  begin
    delete from public.period_doses
     where period_id = p_period_id and not (id = any (v_keep));
  exception when foreign_key_violation then
    raise exception 'Dawka ma już odhaczenia' using errcode = '23503', hint = 'dose_has_history';
  end;

  for v_dose in select * from jsonb_array_elements(p_doses) loop
    v_dose_id := nullif(v_dose->>'id', '')::uuid;

    if v_dose_id is not null then
      update public.period_doses
         set slot_id = (v_dose->>'slot_id')::uuid,
             exact_time = nullif(v_dose->>'exact_time', '')::time
       where id = v_dose_id and period_id = p_period_id;
      if not found then
        raise exception 'Nie znaleziono dawki' using errcode = 'P0002';
      end if;
      delete from public.period_dose_parts where period_dose_id = v_dose_id;
    else
      -- Nowa dawka trafia na koniec swojej pory.
      insert into public.period_doses (period_id, slot_id, exact_time, sort_order)
      values (
        p_period_id,
        (v_dose->>'slot_id')::uuid,
        nullif(v_dose->>'exact_time', '')::time,
        (select coalesce(max(d.sort_order), 0) + 1
           from public.period_doses d
          where d.slot_id = (v_dose->>'slot_id')::uuid)
      )
      returning id into v_dose_id;
    end if;

    if jsonb_array_length(coalesce(v_dose->'parts', '[]'::jsonb)) = 0 then
      raise exception 'Dawka bez ilości' using errcode = '22023', hint = 'empty_dose';
    end if;

    for v_part in select * from jsonb_array_elements(v_dose->'parts') loop
      v_pkg_id := coalesce(
        nullif(v_part->>'package_id', '')::uuid,
        p_package_ids[(v_part->>'package_index')::int + 1]
      );
      v_qty := (v_part->>'quantity')::numeric;
      if v_pkg_id is null then
        raise exception 'Nie wskazano opakowania' using errcode = '22023';
      end if;
      insert into public.period_dose_parts (period_dose_id, package_id, quantity)
      values (v_dose_id, v_pkg_id, v_qty);
    end loop;
  end loop;
end;
$$;

-- Kreator „Dodaj lek”: lek, opakowania (ze stanem początkowym), pierwszy okres z dawkami.
-- p: { name, form, description, low_stock_days|null,
--      packages: [{ strength_value, strength_unit, unit_label, package_size, stock }],
--      period: { valid_from, valid_to|null, doses: [...] } | null }
create function public.create_medication(p jsonb)
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

  if jsonb_typeof(p->'period') = 'object' then
    insert into public.dosing_periods (medication_id, valid_from, valid_to)
    values (v_med, (p->'period'->>'valid_from')::date, nullif(p->'period'->>'valid_to', '')::date)
    returning id into v_period;
    perform public.replace_period_doses(v_period, p->'period'->'doses', v_pkg_ids);
  end if;

  return v_med;
end;
$$;

-- Edycja okresu: daty i dawki. Odhaczenia muszą zostać w nowym zakresie dat.
create function public.save_period(p_period_id uuid, p_from date, p_to date, p_doses jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from public.dosing_periods where id = p_period_id) then
    raise exception 'Nie znaleziono okresu' using errcode = 'P0002';
  end if;

  if exists (
    select 1
      from public.intake_log l
      join public.period_doses d on d.id = l.period_dose_id
     where d.period_id = p_period_id
       and (l.date < p_from or (p_to is not null and l.date > p_to))
  ) then
    raise exception 'Poza nowym zakresem są odhaczone dawki' using errcode = '22023', hint = 'intakes_outside';
  end if;

  update public.dosing_periods set valid_from = p_from, valid_to = p_to where id = p_period_id;
  perform public.replace_period_doses(p_period_id, p_doses);
end;
$$;

-- Usunięcie okresu bez historii przyjęć.
create function public.delete_period(p_period_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.dosing_periods where id = p_period_id;
exception when foreign_key_violation then
  raise exception 'Okres ma już odhaczenia' using errcode = '23503', hint = 'period_has_history';
end;
$$;

-- Usunięcie leku bez historii przyjęć (pomyłka przy dodawaniu). Lek z historią się archiwizuje.
create function public.delete_medication(p_medication_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
      from public.intake_log l
      join public.period_doses d on d.id = l.period_dose_id
      join public.dosing_periods p on p.id = d.period_id
     where p.medication_id = p_medication_id
  ) then
    raise exception 'Lek ma historię przyjęć' using errcode = '23503', hint = 'medication_has_history';
  end if;

  -- Najpierw składniki dawek: opakowania są chronione przed usunięciem (ON DELETE RESTRICT).
  delete from public.period_dose_parts part
   using public.period_doses d, public.dosing_periods p
   where part.period_dose_id = d.id and d.period_id = p.id and p.medication_id = p_medication_id;
  delete from public.medications where id = p_medication_id;
end;
$$;

-- Dodanie lub zmiana opakowania. p_stock (gdy podany) ustawia stan ruchem „correction”.
create function public.save_package(
  p_medication_id  uuid,
  p_package_id     uuid,
  p_strength_value numeric,
  p_strength_unit  text,
  p_unit_label     text,
  p_package_size   numeric,
  p_stock          numeric
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id    uuid := p_package_id;
  v_delta numeric;
begin
  if v_id is null then
    insert into public.med_packages (medication_id, strength_value, strength_unit, unit_label, package_size)
    values (p_medication_id, p_strength_value, p_strength_unit, p_unit_label, p_package_size)
    returning id into v_id;
  else
    update public.med_packages
       set strength_value = p_strength_value,
           strength_unit = p_strength_unit,
           unit_label = p_unit_label,
           package_size = p_package_size
     where id = v_id and medication_id = p_medication_id;
    if not found then
      raise exception 'Nie znaleziono opakowania' using errcode = 'P0002';
    end if;
  end if;

  if p_stock is not null then
    select p_stock - stock_cached into v_delta from public.med_packages where id = v_id;
    if v_delta <> 0 then
      insert into public.stock_movements (package_id, delta, reason) values (v_id, v_delta, 'correction');
    end if;
  end if;

  return v_id;
end;
$$;

revoke execute on function
  public.replace_period_doses(uuid, jsonb, uuid[]),
  public.create_medication(jsonb),
  public.save_period(uuid, date, date, jsonb),
  public.delete_period(uuid),
  public.delete_medication(uuid),
  public.save_package(uuid, uuid, numeric, text, text, numeric, numeric)
from public, anon;

grant execute on function
  public.replace_period_doses(uuid, jsonb, uuid[]),
  public.create_medication(jsonb),
  public.save_period(uuid, date, date, jsonb),
  public.delete_period(uuid),
  public.delete_medication(uuid),
  public.save_package(uuid, uuid, numeric, text, text, numeric, numeric)
to authenticated;
