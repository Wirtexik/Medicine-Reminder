import { shortDate } from "../dates";
import { activePeriod } from "./checklist";
import { doseTotal } from "./format";
import type { DateKey, DosingPeriod, Medication, PeriodDose, TimeSlot } from "./types";

/** Dawki okresu w kolejności pór dnia. */
export function sortedDoses(period: DosingPeriod, slots: TimeSlot[]): PeriodDose[] {
  const order = new Map(slots.map((s) => [s.id, s.sortOrder]));
  return [...period.doses].sort(
    (a, b) => (order.get(a.slotId) ?? 0) - (order.get(b.slotId) ?? 0) || (a.exactTime ?? "").localeCompare(b.exactTime ?? ""),
  );
}

/** „30 mg · po śniadaniu”, „500 mg · 3 × dziennie”, „2 × dziennie: 30 mg, 10 mg”. */
export function periodSummary(med: Medication, period: DosingPeriod, slots: TimeSlot[]): string {
  const doses = sortedDoses(period, slots);
  if (doses.length === 0) return "bez dawek";
  const totals = doses.map((d) => doseTotal(med, d));
  if (doses.length === 1) {
    const slot = slots.find((s) => s.id === doses[0].slotId)?.name ?? "";
    return [totals[0], slot.toLocaleLowerCase("pl-PL")].filter(Boolean).join(" · ");
  }
  if (totals.every((t) => t === totals[0])) return `${totals[0]} · ${doses.length} × dziennie`;
  return `${doses.length} × dziennie: ${totals.join(", ")}`;
}

/** Opis aktualnego dawkowania na liście leków. */
export function currentDosing(med: Medication, slots: TimeSlot[], today: DateKey): string {
  const now = activePeriod(med, today);
  if (now) return periodSummary(med, now, slots);
  const next = med.periods.find((p) => p.validFrom > today);
  if (next) return `od ${shortDate(next.validFrom)}: ${periodSummary(med, next, slots)}`;
  return "bez dawkowania";
}

/** „01.11 – 15.11”, „od 16.11”. */
export function periodRange(period: DosingPeriod): string {
  return period.validTo ? `${shortDate(period.validFrom)} – ${shortDate(period.validTo)}` : `od ${shortDate(period.validFrom)}`;
}

export type PeriodPhase = "past" | "current" | "future";

export function periodPhase(period: DosingPeriod, today: DateKey): PeriodPhase {
  if (period.validFrom > today) return "future";
  if (period.validTo !== null && period.validTo < today) return "past";
  return "current";
}
