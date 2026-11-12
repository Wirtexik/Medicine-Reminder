import type { MedForm, MedPackage, StrengthUnit, UnitLabel } from "./types";
import { formatNumber, packageLabel, unitFor } from "./format";

/*
  Forma leku wyznacza jednostki opakowań (PROJEKT.md §5.2):
  - tabletki i kapsułki: moc w mg lub µg, liczone w sztukach,
  - krople i syrop: bez mocy (1 kropla / 1 ml), liczone w kroplach lub ml.
*/

export const FORMS: { value: MedForm; label: string; hint: string }[] = [
  { value: "tablet", label: "Tabletki", hint: "Liczone w sztukach, można dzielić na ½ i ¼" },
  { value: "capsule", label: "Kapsułki", hint: "Liczone w sztukach" },
  { value: "drops", label: "Krople", hint: "Liczone w kroplach" },
  { value: "syrup", label: "Syrop", hint: "Liczony w mililitrach" },
];

export const FORM_LABEL: Record<MedForm, string> = {
  tablet: "Tabletki",
  capsule: "Kapsułki",
  drops: "Krople",
  syrup: "Syrop",
};

export const UNIT_LABEL: Record<MedForm, UnitLabel> = {
  tablet: "tabl.",
  capsule: "kaps.",
  drops: "krople",
  syrup: "ml",
};

/** Czy opakowania tej formy mają moc (mg/µg). Krople i syrop liczone są wprost. */
export function hasStrength(form: MedForm): boolean {
  return form === "tablet" || form === "capsule";
}

/** Jednostka „mocy” dla form bez mocy: 1 kropla, 1 ml. */
export function fixedStrengthUnit(form: MedForm): StrengthUnit {
  return form === "syrup" ? "ml" : "krople";
}

/** Krok i wartość startowa ilości w dawce. */
export function quantityStep(form: MedForm): { step: number; initial: number } {
  switch (form) {
    case "tablet":
      return { step: 0.25, initial: 1 };
    case "syrup":
      return { step: 0.5, initial: 5 };
    default:
      return { step: 1, initial: 1 };
  }
}

/** Nazwa opakowania na liście: „20 mg” albo „Butelka” (krople, syrop). */
export function packageName(pkg: MedPackage): string {
  return pkg.unitLabel === "krople" || pkg.unitLabel === "ml" ? "Butelka" : packageLabel(pkg);
}

/** „opak. 20 tabl.”; przy butelce sama pojemność („100 kropli”), bo nazwa to już „Butelka”. */
export function packageSizeLabel(pkg: MedPackage): string {
  const bottle = pkg.unitLabel === "krople" || pkg.unitLabel === "ml";
  const size = `${formatNumber(pkg.packageSize)} ${unitFor(pkg.packageSize, pkg.unitLabel)}`;
  return bottle ? size : `opak. ${size}`;
}

/** Liczba z pola tekstowego; przecinek dziesiętny dozwolony. NaN przy błędzie. */
export function parseNumber(text: string): number {
  const t = text.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return Number.NaN;
  return Number(t);
}
