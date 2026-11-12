import type { MedPackage, Medication, PeriodDose, UnitLabel } from "./types";

const FRACTIONS: Record<string, string> = {
  "0.25": "¼",
  "0.5": "½",
  "0.75": "¾",
};

/** 0.5 → „½”, 1.5 → „1½”, 2 → „2”. */
export function formatQuantity(q: number): string {
  const whole = Math.floor(q);
  const frac = +(q - whole).toFixed(2);
  const fracGlyph = FRACTIONS[String(frac)];
  if (frac === 0) return String(whole);
  if (fracGlyph) return whole === 0 ? fracGlyph : `${whole}${fracGlyph}`;
  return q.toLocaleString("pl-PL");
}

/** Twarda spacja: liczba i jednostka nigdy nie rozdzielą się na dwie linie. */
const NBSP = "\u00a0";

export function formatNumber(n: number): string {
  return n.toLocaleString("pl-PL", { maximumFractionDigits: 2 });
}

export function packageLabel(pkg: MedPackage): string {
  return `${formatNumber(pkg.strengthValue)}${NBSP}${pkg.strengthUnit}`;
}

/** Łączna dawka, np. „30 mg”. Dla kropli: liczba kropli. */
export function doseTotal(med: Pick<Medication, "packages">, dose: Pick<PeriodDose, "parts">): string {
  const parts = dose.parts.map((p) => ({
    part: p,
    pkg: med.packages.find((k) => k.id === p.packageId)!,
  }));
  const unit = parts[0]?.pkg.strengthUnit;
  if (!unit) return "";
  if (unit === "krople") {
    const n = parts.reduce((s, { part }) => s + part.quantity, 0);
    return `${formatQuantity(n)}${NBSP}${pluralKrople(n)}`;
  }
  const sameUnit = parts.every(({ pkg }) => pkg.strengthUnit === unit);
  if (!sameUnit) return "";
  const total = parts.reduce((s, { part, pkg }) => s + part.quantity * pkg.strengthValue, 0);
  return `${formatNumber(total)}${NBSP}${unit}`;
}

/** Rozpis opakowań: „1 tabl.” albo „1 × 20 mg + 1 × 10 mg”. */
export function doseBreakdown(med: Pick<Medication, "packages">, dose: Pick<PeriodDose, "parts">): string {
  if (dose.parts.length === 1) {
    const part = dose.parts[0];
    const pkg = med.packages.find((k) => k.id === part.packageId)!;
    return `${formatQuantity(part.quantity)} ${unitFor(part.quantity, pkg.unitLabel)}`;
  }
  return dose.parts
    .map((part) => {
      const pkg = med.packages.find((k) => k.id === part.packageId)!;
      return `${formatQuantity(part.quantity)} × ${packageLabel(pkg)}`;
    })
    .join(" + ");
}

/** Jednostka po liczbie: „1 kropla”, „120 kropli”. Pozostałe (tabl., kaps., ml) to skróty bez odmiany. */
export function unitFor(n: number, unitLabel: UnitLabel): string {
  return unitLabel === "krople" ? pluralKrople(n) : unitLabel;
}

export function pluralKrople(n: number): string {
  if (!Number.isInteger(n)) return "kropli";
  if (n === 1) return "kropla";
  const d = n % 10;
  const t = n % 100;
  if (d >= 2 && d <= 4 && (t < 12 || t > 14)) return "krople";
  return "kropli";
}

/** 1 dzień, 2 dni, 5 dni. */
export function pluralDni(n: number): string {
  return n === 1 ? "dzień" : "dni";
}

/** Polska odmiana: 1 lek, 2 leki, 5 leków. */
export function pluralLeki(n: number): string {
  if (n === 1) return "lek";
  const d = n % 10;
  const t = n % 100;
  if (d >= 2 && d <= 4 && (t < 12 || t > 14)) return "leki";
  return "leków";
}
