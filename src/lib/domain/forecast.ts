import { shiftDay } from "../dates";
import { activePeriod } from "./checklist";
import type { AppData, DateKey, MedPackage, Medication } from "./types";

const HORIZON_DAYS = 400;

export interface PackageForecast {
  pkg: MedPackage;
  /** Ostatni dzień, na który wystarczy; null = poza horyzontem albo nieużywane. */
  lastDay: DateKey | null;
  daysLeft: number | null;
}

export interface MedForecast {
  med: Medication;
  packages: PackageForecast[];
  /** Najsłabsze ogniwo: opakowanie, które skończy się pierwsze. */
  weakest: PackageForecast | null;
  threshold: number;
  isLow: boolean;
}

/**
 * Symulacja dzień po dniu (PROJEKT.md §5.5): uwzględnia przyszłe okresy dawkowania
 * i pomija dawki już odhaczone dzisiaj (ich stan został już odjęty).
 */
export function forecastMedication(data: AppData, med: Medication, today: DateKey): MedForecast {
  const takenToday = new Set(data.intakes.filter((i) => i.date === today).map((i) => i.doseId));
  const remaining = new Map(med.packages.map((p) => [p.id, p.stock]));
  const lastDay = new Map<string, DateKey | null>();
  const used = new Set<string>();

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const day = shiftDay(today, i);
    const period = activePeriod(med, day);
    if (!period) continue;
    const need = new Map<string, number>();
    for (const dose of period.doses) {
      if (i === 0 && takenToday.has(dose.id)) continue;
      for (const part of dose.parts) {
        need.set(part.packageId, (need.get(part.packageId) ?? 0) + part.quantity);
      }
    }
    for (const [pkgId, qty] of need) {
      used.add(pkgId);
      if (lastDay.has(pkgId)) continue;
      const left = remaining.get(pkgId) ?? 0;
      if (left < qty) {
        lastDay.set(pkgId, shiftDay(day, -1));
      } else {
        remaining.set(pkgId, left - qty);
      }
    }
  }

  const packages: PackageForecast[] = med.packages.map((pkg) => {
    const ld = lastDay.get(pkg.id) ?? null;
    return {
      pkg,
      lastDay: used.has(pkg.id) ? ld : null,
      daysLeft: ld === null ? null : Math.max(0, daysBetween(today, ld) + 1),
    };
  });

  const finite = packages.filter((p) => p.daysLeft !== null);
  const weakest = finite.sort((a, b) => a.daysLeft! - b.daysLeft!)[0] ?? null;
  const threshold = med.lowStockDays ?? data.defaultLowStockDays;
  return { med, packages, weakest, threshold, isLow: weakest !== null && weakest.daysLeft! <= threshold };
}

function daysBetween(a: DateKey, b: DateKey): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function lowStock(data: AppData, today: DateKey): MedForecast[] {
  return data.medications
    .filter((m) => !m.isArchived)
    .map((m) => forecastMedication(data, m, today))
    .filter((f) => f.isLow)
    .sort((a, b) => a.weakest!.daysLeft! - b.weakest!.daysLeft!);
}
