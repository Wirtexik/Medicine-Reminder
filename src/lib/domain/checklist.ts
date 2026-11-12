import { dayDiff } from "../dates";
import type { AppData, DateKey, DosingPeriod, Medication, PeriodDose, TimeSlot } from "./types";

export type DayMode = "editable" | "readonly-past" | "future";

export interface ChecklistItem {
  med: Medication;
  period: DosingPeriod;
  dose: PeriodDose;
  taken: boolean;
}

export interface SlotGroup {
  slot: TimeSlot;
  items: ChecklistItem[];
  takenCount: number;
  done: boolean;
}

export function activePeriod(med: Medication, date: DateKey): DosingPeriod | undefined {
  return med.periods.find((p) => p.validFrom <= date && (p.validTo === null || date <= p.validTo));
}

/** Dziś i wczoraj można edytować; starsze dni tylko do podglądu (PROJEKT.md §5.4). */
export function dayMode(date: DateKey, today: DateKey): DayMode {
  const diff = dayDiff(date, today);
  if (diff > 0) return "future";
  if (diff >= -1) return "editable";
  return "readonly-past";
}

/** Lista na dany dzień jest wyliczana z okresów aktywnych w tym dniu. */
export function buildChecklist(data: AppData, date: DateKey): SlotGroup[] {
  const taken = new Set(data.intakes.filter((i) => i.date === date).map((i) => i.doseId));
  const bySlot = new Map<string, ChecklistItem[]>();

  for (const med of data.medications) {
    if (med.isArchived) continue;
    const period = activePeriod(med, date);
    if (!period) continue;
    for (const dose of period.doses) {
      const list = bySlot.get(dose.slotId) ?? [];
      list.push({ med, period, dose, taken: taken.has(dose.id) });
      bySlot.set(dose.slotId, list);
    }
  }

  return [...data.slots]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .filter((slot) => bySlot.has(slot.id))
    .map((slot) => {
      const items = bySlot
        .get(slot.id)!
        .sort((a, b) => a.dose.sortOrder - b.dose.sortOrder || a.med.name.localeCompare(b.med.name, "pl"));
      const takenCount = items.filter((i) => i.taken).length;
      return { slot, items, takenCount, done: takenCount === items.length };
    });
}

export type DayStatus = "all" | "some" | "none" | "empty";

export function dayStatus(data: AppData, date: DateKey): DayStatus {
  const groups = buildChecklist(data, date);
  const total = groups.reduce((s, g) => s + g.items.length, 0);
  if (total === 0) return "empty";
  const taken = groups.reduce((s, g) => s + g.takenCount, 0);
  if (taken === total) return "all";
  if (taken === 0) return "none";
  return "some";
}
