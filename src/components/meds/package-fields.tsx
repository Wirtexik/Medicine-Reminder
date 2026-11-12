"use client";

import { Segmented } from "@/components/ui/controls";
import { TextField } from "@/components/ui/text-field";
import type { PackageDraft } from "@/lib/data/meds";
import { formatNumber } from "@/lib/domain/format";
import { fixedStrengthUnit, hasStrength, parseNumber, UNIT_LABEL } from "@/lib/domain/forms";
import type { MedForm, MedPackage } from "@/lib/domain/types";

/** Stan pól opakowania (tekst, jak w polach formularza). */
export interface PackageForm {
  strength: string;
  unit: "mg" | "µg";
  size: string;
  stock: string;
}

export type PackageErrors = Partial<Record<keyof PackageForm, string>>;

export const emptyPackageForm = (): PackageForm => ({ strength: "", unit: "mg", size: "", stock: "" });

export function packageFormFrom(pkg: MedPackage): PackageForm {
  const n = (v: number) => formatNumber(v).replace(/\s/g, "");
  return {
    strength: n(pkg.strengthValue),
    unit: pkg.strengthUnit === "µg" ? "µg" : "mg",
    size: n(pkg.packageSize),
    stock: n(pkg.stock),
  };
}

export function parsePackageForm(form: MedForm, f: PackageForm): { draft: PackageDraft | null; errors: PackageErrors } {
  const errors: PackageErrors = {};
  const withStrength = hasStrength(form);
  const strength = withStrength ? parseNumber(f.strength) : 1;
  const size = parseNumber(f.size);
  const stock = parseNumber(f.stock);
  if (withStrength && !(strength > 0)) errors.strength = "Podaj moc, np. 20.";
  if (!(size > 0)) errors.size = withStrength ? "Podaj liczbę sztuk w opakowaniu." : "Podaj pojemność butelki.";
  if (!(stock >= 0)) errors.stock = "Podaj, ile masz teraz (może być 0).";
  if (Object.keys(errors).length > 0) return { draft: null, errors };
  return {
    draft: {
      strengthValue: strength,
      strengthUnit: withStrength ? f.unit : fixedStrengthUnit(form),
      unitLabel: UNIT_LABEL[form],
      packageSize: size,
      stock,
    },
    errors,
  };
}

/** Pola opakowania. Dla kropli i syropu bez mocy: tylko pojemność i stan. */
export function PackageFields({
  form,
  value,
  onChange,
  errors = {},
}: {
  form: MedForm;
  value: PackageForm;
  onChange: (value: PackageForm) => void;
  errors?: PackageErrors;
}) {
  const unit = UNIT_LABEL[form];
  const set = (patch: Partial<PackageForm>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      {hasStrength(form) && (
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <TextField
              label="Moc"
              inputMode="decimal"
              autoComplete="off"
              placeholder="np. 20"
              value={value.strength}
              onChange={(e) => set({ strength: e.target.value })}
              error={errors.strength}
            />
          </div>
          <div className="mt-[1.52rem] w-[8.5rem] shrink-0">
            <Segmented
              label="Jednostka mocy"
              value={value.unit}
              onChange={(u) => set({ unit: u })}
              options={[
                { value: "mg", label: "mg" },
                { value: "µg", label: "µg" },
              ]}
            />
          </div>
        </div>
      )}
      <TextField
        label={hasStrength(form) ? "W opakowaniu" : "Pojemność butelki"}
        inputMode="decimal"
        autoComplete="off"
        suffix={unit}
        value={value.size}
        onChange={(e) => set({ size: e.target.value })}
        error={errors.size}
      />
      <TextField
        label="Stan teraz"
        inputMode="decimal"
        autoComplete="off"
        suffix={unit}
        hint={hasStrength(form) ? "Ile sztuk tej mocy masz teraz w domu, we wszystkich opakowaniach." : "Ile zostało w otwartej i zapasowych butelkach."}
        value={value.stock}
        onChange={(e) => set({ stock: e.target.value })}
        error={errors.stock}
      />
    </div>
  );
}
