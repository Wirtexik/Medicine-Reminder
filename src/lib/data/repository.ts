import type { SupabaseClient } from "@supabase/supabase-js";
import type { DateKey, Intake, Medication, MedForm, StrengthUnit, TimeSlot, UnitLabel } from "../domain/types";
import type { Database } from "./database.types";

/*
  Odczyt i zapis danych w Supabase. Mapuje wiersze bazy (snake_case) na model
  domenowy (src/lib/domain/types.ts). Dostęp ogranicza RLS: zapytania widzą
  wyłącznie dane zalogowanego użytkownika, więc nie filtrujemy po user_id.
*/

type Client = SupabaseClient<Database>;

/** PostgREST nie odda więcej wierszy naraz (domyślne `max_rows`). */
const PAGE_SIZE = 1000;

export interface BaseData {
  slots: TimeSlot[];
  medications: Medication[];
  defaultLowStockDays: number;
}

/** „HH:mm:ss” z kolumny `time` → „HH:mm”. */
function hhmm(value: string | null): string | null {
  return value ? value.slice(0, 5) : null;
}

const MEDICATIONS_QUERY = `
  id, name, form, description, low_stock_days, is_archived,
  med_packages ( id, strength_value, strength_unit, unit_label, package_size, stock_cached, created_at ),
  dosing_periods (
    id, valid_from, valid_to,
    period_doses ( id, slot_id, exact_time, sort_order, period_dose_parts ( package_id, quantity ) )
  )
` as const;

/** Pory, leki (z opakowaniami, okresami i dawkami) i profil: trzy zapytania równolegle. */
export async function fetchBase(supabase: Client): Promise<BaseData> {
  const [slotsRes, medsRes, profileRes] = await Promise.all([
    supabase.from("time_slots").select("id, name, sort_order, reminder_time").order("sort_order"),
    supabase.from("medications").select(MEDICATIONS_QUERY).order("name"),
    supabase.from("profiles").select("low_stock_days").maybeSingle(),
  ]);
  if (slotsRes.error) throw slotsRes.error;
  if (medsRes.error) throw medsRes.error;
  if (profileRes.error) throw profileRes.error;

  // Wszystkie pory, także wyłączone: dawka w wyłączonej porze nie może zniknąć z listy bez śladu.
  const slots: TimeSlot[] = slotsRes.data.map((s) => ({
    id: s.id,
    name: s.name,
    sortOrder: s.sort_order,
    reminderTime: hhmm(s.reminder_time) ?? "",
  }));

  const medications: Medication[] = medsRes.data.map((m) => ({
    id: m.id,
    name: m.name,
    form: m.form as MedForm,
    description: m.description,
    lowStockDays: m.low_stock_days,
    isArchived: m.is_archived,
    packages: [...m.med_packages]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((p) => ({
        id: p.id,
        strengthValue: Number(p.strength_value),
        strengthUnit: p.strength_unit as StrengthUnit,
        unitLabel: p.unit_label as UnitLabel,
        packageSize: Number(p.package_size),
        stock: Number(p.stock_cached),
      })),
    periods: [...m.dosing_periods]
      .sort((a, b) => a.valid_from.localeCompare(b.valid_from))
      .map((p) => ({
        id: p.id,
        validFrom: p.valid_from,
        validTo: p.valid_to,
        doses: p.period_doses.map((d) => ({
          id: d.id,
          slotId: d.slot_id,
          exactTime: hhmm(d.exact_time),
          sortOrder: d.sort_order,
          parts: d.period_dose_parts.map((part) => ({ packageId: part.package_id, quantity: Number(part.quantity) })),
        })),
      })),
  }));

  return { slots, medications, defaultLowStockDays: profileRes.data?.low_stock_days ?? 7 };
}

/** Odhaczenia z zakresu dat (włącznie), stronicowane. */
export async function fetchIntakes(supabase: Client, from: DateKey, to: DateKey): Promise<Intake[]> {
  const out: Intake[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("intake_log")
      .select("period_dose_id, date")
      .gte("date", from)
      .lte("date", to)
      .order("id")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    for (const row of data) out.push({ doseId: row.period_dose_id, date: row.date });
    if (data.length < PAGE_SIZE) return out;
  }
}

async function rpc(call: PromiseLike<{ error: unknown }>): Promise<void> {
  const { error } = await call;
  if (error) throw error;
}

export const takeDose = (s: Client, doseId: string, date: DateKey) =>
  rpc(s.rpc("take_dose", { p_dose_id: doseId, p_date: date }));

export const untakeDose = (s: Client, doseId: string, date: DateKey) =>
  rpc(s.rpc("untake_dose", { p_dose_id: doseId, p_date: date }));

export const takeSlot = (s: Client, doseIds: string[], date: DateKey) =>
  rpc(s.rpc("take_slot", { p_dose_ids: doseIds, p_date: date }));

export const reorderDoses = (s: Client, doseIds: string[]) => rpc(s.rpc("reorder_doses", { p_dose_ids: doseIds }));
