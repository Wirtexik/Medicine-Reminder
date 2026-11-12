-- Leki: poprawka komunikatów o historii przyjęć (docs/PLAN.md §10).
--
-- ON DELETE RESTRICT zgłasza restrict_violation (23001), a nie foreign_key_violation (23503),
-- więc handlery z 20261112120000_meds_editing.sql nigdy się nie włączały: usunięcie dawki
-- lub okresu z odhaczeniami kończyło się surowym błędem zamiast podpowiedzi (hint) dla aplikacji.
-- Wykryte testem supabase/tests/db.test.ts. Funkcje bez innych zmian.

create or replace function public.replace_period_doses(p_period_id uuid, p_doses jsonb, p_package_ids uuid[] default '{}')
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
  exception when foreign_key_violation or restrict_violation then
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

create or replace function public.delete_period(p_period_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.dosing_periods where id = p_period_id;
exception when foreign_key_violation or restrict_violation then
  raise exception 'Okres ma już odhaczenia' using errcode = '23503', hint = 'period_has_history';
end;
$$;
