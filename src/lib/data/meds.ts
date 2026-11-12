import type { SupabaseClient } from "@supabase/supabase-js";
import type { DateKey, MedForm, MedPackage, PeriodDose } from "../domain/types";
import type { Database, Json } from "./database.types";

/*
  Zapis leków, opakowań i okresów (ekran „Leki”). Operacje na kilku tabelach idą
  przez funkcje z supabase/migrations/20261112120000_meds_editing.sql (jedna transakcja).
  Po zapisie wywołujący odświeża magazyn (useStore().refresh).
*/

type Client = SupabaseClient<Database>;

/** Dawka w edytorze. `isNew`: jeszcze nie ma jej w bazie (id jest wtedy kluczem roboczym). */
export interface DoseDraft extends PeriodDose {
  isNew: boolean;
}

export interface PackageDraft {
  strengthValue: number;
  strengthUnit: MedPackage["strengthUnit"];
  unitLabel: MedPackage["unitLabel"];
  packageSize: number;
  stock: number;
}

export interface NewMedication {
  name: string;
  form: MedForm;
  description: string;
  lowStockDays: number | null;
  packages: PackageDraft[];
  /** Etapy dawkowania w kolejności dat (zwykle jeden). */
  periods: PeriodDraft[];
}

/** Okres (etap planu) do zapisu. */
export interface PeriodDraft {
  validFrom: DateKey;
  validTo: DateKey | null;
  doses: DoseDraft[];
}

function periodsJson(periods: PeriodDraft[], packageRef: (packageId: string) => Record<string, Json>): Json {
  return periods.map((p) => ({ valid_from: p.validFrom, valid_to: p.validTo, doses: dosesJson(p.doses, packageRef) }));
}

function dosesJson(doses: DoseDraft[], packageRef: (packageId: string) => Record<string, Json>): Json {
  return doses.map((d) => ({
    id: d.isNew ? null : d.id,
    slot_id: d.slotId,
    exact_time: d.exactTime,
    parts: d.parts.filter((p) => p.quantity > 0).map((p) => ({ ...packageRef(p.packageId), quantity: p.quantity })),
  }));
}

async function check<T>(call: PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  const { data, error } = await call;
  if (error) throw error;
  return data;
}

/** `packageKeys[i]` to klucz roboczy i-tego opakowania, używany w dawkach. */
export function createMedication(s: Client, med: NewMedication, packageKeys: string[]): Promise<string> {
  const p: Json = {
    name: med.name,
    form: med.form,
    description: med.description,
    low_stock_days: med.lowStockDays,
    packages: med.packages.map((pkg) => ({
      strength_value: pkg.strengthValue,
      strength_unit: pkg.strengthUnit,
      unit_label: pkg.unitLabel,
      package_size: pkg.packageSize,
      stock: pkg.stock,
    })),
    periods: periodsJson(med.periods, (key) => ({ package_index: packageKeys.indexOf(key) })),
  };
  return check(s.rpc("create_medication", { p })).then((id) => id as string);
}

export function updateMedication(
  s: Client,
  id: string,
  fields: { name?: string; description?: string; lowStockDays?: number | null; isArchived?: boolean },
): Promise<null> {
  return check(
    s
      .from("medications")
      .update({
        name: fields.name,
        description: fields.description,
        low_stock_days: fields.lowStockDays,
        is_archived: fields.isArchived,
      })
      .eq("id", id),
  );
}

export function deleteMedication(s: Client, id: string) {
  return check(s.rpc("delete_medication", { p_medication_id: id }));
}

/** `stock: null` zostawia stan bez zmian; liczba ustawia go ruchem „correction”. */
export function savePackage(
  s: Client,
  medicationId: string,
  packageId: string | null,
  pkg: Omit<PackageDraft, "stock"> & { stock: number | null },
) {
  return check(
    s.rpc("save_package", {
      p_medication_id: medicationId,
      p_package_id: packageId,
      p_strength_value: pkg.strengthValue,
      p_strength_unit: pkg.strengthUnit,
      p_unit_label: pkg.unitLabel,
      p_package_size: pkg.packageSize,
      p_stock: pkg.stock,
    }),
  );
}

export function deletePackage(s: Client, packageId: string) {
  return check(s.from("med_packages").delete().eq("id", packageId));
}

export function savePeriod(s: Client, periodId: string, from: DateKey, to: DateKey | null, doses: DoseDraft[]) {
  return check(
    s.rpc("save_period", {
      p_period_id: periodId,
      p_from: from,
      p_to: to,
      p_doses: dosesJson(doses, (id) => ({ package_id: id })),
    }),
  );
}

export function deletePeriod(s: Client, periodId: string) {
  return check(s.rpc("delete_period", { p_period_id: periodId }));
}

/**
 * Plan dawkowania od dnia pierwszego etapu: bieżący okres kończy się dzień wcześniej,
 * późniejsze okresy są zastępowane etapami planu (jedna transakcja).
 */
export function planPeriods(s: Client, medicationId: string, periods: PeriodDraft[]) {
  return check(s.rpc("plan_periods", { p_medication_id: medicationId, p_periods: periodsJson(periods, (id) => ({ package_id: id })) }));
}

/** „Od dnia… nowe dawkowanie”. Zwraca id nowego okresu (z kopią dawek poprzedniego). */
export function startNewPeriod(s: Client, medicationId: string, from: DateKey): Promise<string> {
  return check(s.rpc("start_new_period", { p_medication_id: medicationId, p_from: from })).then((id) => id as string);
}

const MESSAGES: Record<string, string> = {
  dose_has_history:
    "Tej dawki nie można usunąć, bo ma już odhaczenia. Żeby zmienić dawkowanie od wybranego dnia, użyj „Od dnia… nowe dawkowanie”.",
  intakes_outside: "Poza nowym zakresem dat są odhaczone dawki. Zakres musi je obejmować.",
  period_has_history: "Tego okresu nie można usunąć, bo ma już odhaczone dawki.",
  medication_has_history: "Lek ma historię przyjęć, więc nie można go usunąć. Możesz go zarchiwizować.",
  period_exists: "Od tego dnia zaczyna się już inny okres dawkowania.",
  has_intakes: "Od tego dnia są już odhaczone dawki. Wybierz późniejszy dzień.",
  empty_dose: "Każda dawka musi mieć ilość większą od zera.",
  no_packages: "Lek musi mieć co najmniej jedno opakowanie.",
};

/** Komunikat dla użytkownika zamiast błędu bazy. */
export function saveErrorMessage(e: unknown): string {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "Brak połączenia z internetem. Spróbuj ponownie.";
  const err = (e ?? {}) as { code?: string; hint?: string };
  if (err.hint && MESSAGES[err.hint]) return MESSAGES[err.hint];
  if (err.code === "23P01") return "Ten okres nachodzi na inny okres dawkowania tego leku.";
  // ON DELETE RESTRICT zgłasza 23001 (restrict_violation), nie 23503.
  if (err.code === "23503" || err.code === "23001") return "To opakowanie jest używane w dawkowaniu. Najpierw usuń je z dawek.";
  if (err.code === "PGRST202") return "Baza nie ma jeszcze funkcji zapisu leków. Trzeba wgrać migracje 20261112120000_meds_editing.sql i 20261112130000_dosing_plan.sql.";
  return "Nie udało się zapisać. Sprawdź połączenie i spróbuj ponownie.";
}
