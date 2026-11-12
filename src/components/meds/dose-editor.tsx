"use client";

import { Clock, Plus, Trash2, X } from "lucide-react";
import { outlineButton, Select, Stepper } from "@/components/ui/controls";
import { TextField } from "@/components/ui/text-field";
import type { DoseDraft } from "@/lib/data/meds";
import { doseBreakdown, doseTotal } from "@/lib/domain/format";
import { packageName, quantityStep, UNIT_LABEL } from "@/lib/domain/forms";
import type { MedForm, MedPackage, TimeSlot } from "@/lib/domain/types";

let draftSeq = 0;
/** Klucz roboczy (crypto.randomUUID nie działa przez http w sieci domowej). */
export const draftKey = (prefix = "draft") => `${prefix}-${++draftSeq}`;

export function newDose(form: MedForm, packages: MedPackage[], slots: TimeSlot[], existing: DoseDraft[]): DoseDraft {
  const used = new Set(existing.map((d) => d.slotId));
  const active = slots.filter((s) => s.isActive);
  const slot = active.find((s) => !used.has(s.id)) ?? active[0] ?? slots[0];
  const { initial } = quantityStep(form);
  return {
    id: draftKey("dose"),
    isNew: true,
    slotId: slot?.id ?? "",
    exactTime: null,
    sortOrder: 0,
    parts: packages[0] ? [{ packageId: packages[0].id, quantity: initial }] : [],
  };
}

/** Błąd dawek do pokazania przy zapisie; null, gdy wszystko w porządku. */
export function validateDoses(doses: DoseDraft[]): string | null {
  if (doses.length === 0) return "Dodaj co najmniej jedną dawkę.";
  if (doses.some((d) => !d.slotId)) return "Wybierz porę dnia dla każdej dawki.";
  if (doses.some((d) => !d.parts.some((p) => p.quantity > 0))) return "Każda dawka musi mieć ilość większą od zera.";
  if (doses.some((d) => d.exactTime !== null && !/^\d{2}:\d{2}$/.test(d.exactTime))) return "Podaj godzinę albo ją usuń.";
  return null;
}

/**
 * Edytor dawek okresu: pora dnia, ilość z każdego opakowania, opcjonalna godzina,
 * podgląd sumy („30 mg = 1 × 20 mg + 1 × 10 mg”).
 */
export function DoseEditor({
  form,
  packages,
  slots,
  doses,
  onChange,
}: {
  form: MedForm;
  packages: MedPackage[];
  slots: TimeSlot[];
  doses: DoseDraft[];
  onChange: (doses: DoseDraft[]) => void;
}) {
  const update = (id: string, patch: Partial<DoseDraft>) => onChange(doses.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const sortedSlots = [...slots].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-3">
      {doses.map((dose, i) => (
        <DoseCard
          key={dose.id}
          index={i}
          form={form}
          dose={dose}
          packages={packages}
          slots={sortedSlots}
          canRemove={doses.length > 1}
          onChange={(patch) => update(dose.id, patch)}
          onRemove={() => onChange(doses.filter((d) => d.id !== dose.id))}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange([...doses, newDose(form, packages, sortedSlots, doses)])}
        className={outlineButton}
      >
        <Plus aria-hidden className="size-4" />
        Dodaj dawkę w innej porze
      </button>
    </div>
  );
}

function DoseCard({
  index,
  form,
  dose,
  packages,
  slots,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  form: MedForm;
  dose: DoseDraft;
  packages: MedPackage[];
  slots: TimeSlot[];
  canRemove: boolean;
  onChange: (patch: Partial<DoseDraft>) => void;
  onRemove: () => void;
}) {
  const { step } = quantityStep(form);
  const unit = UNIT_LABEL[form];
  const qty = (pkgId: string) => dose.parts.find((p) => p.packageId === pkgId)?.quantity ?? 0;
  const setQty = (pkgId: string, quantity: number) => {
    const rest = dose.parts.filter((p) => p.packageId !== pkgId);
    onChange({ parts: quantity > 0 ? [...rest, { packageId: pkgId, quantity }] : rest });
  };

  // Składniki w kolejności opakowań, bez zer: do podglądu sumy.
  const parts = packages.map((p) => ({ packageId: p.id, quantity: qty(p.id) })).filter((p) => p.quantity > 0);
  const preview = { packages };
  const total = parts.length > 0 ? doseTotal(preview, { parts }) : "";
  const breakdown = parts.length > 0 ? doseBreakdown(preview, { parts }) : "";
  const slotLabel = slots.find((s) => s.id === dose.slotId)?.name ?? `Dawka ${index + 1}`;

  return (
    <fieldset className="rounded-[var(--radius-card)] bg-card px-5 pt-4 pb-5">
      <legend className="sr-only">{slotLabel}</legend>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Select
            label="Pora dnia"
            value={dose.slotId}
            onChange={(slotId) => onChange({ slotId })}
            options={slots
              .filter((s) => s.isActive || s.id === dose.slotId)
              .map((s) => ({ value: s.id, label: s.isActive ? s.name : `${s.name} (wyłączona)` }))}
          />
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Usuń dawkę: ${slotLabel}`}
            className="mb-1 grid size-11 shrink-0 place-items-center rounded-full text-text-2 active:scale-90"
          >
            <Trash2 aria-hidden className="size-5" />
          </button>
        )}
      </div>

      <ul className="mt-3 divide-y divide-line">
        {packages.map((pkg) => (
          // Przy większym tekście licznik schodzi pod nazwę (wyrównany do prawej), zamiast wypychać kartę.
          <li key={pkg.id} className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-1.5">
            <span className="min-w-0 text-body">{packages.length === 1 ? "Ilość" : packageName(pkg)}</span>
            <div className="ml-auto">
              <Stepper
                label={packages.length === 1 ? `Ilość, ${slotLabel}` : `${packageName(pkg)}, ${slotLabel}`}
                value={qty(pkg.id)}
                step={step}
                unit={unit}
                onChange={(v) => setQty(pkg.id, v)}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-meta text-text-2" aria-live="polite">
        {total ? (
          <>
            Razem <span className="font-semibold whitespace-nowrap text-text">{total}</span>
            {parts.length > 1 && ` = ${breakdown}`}
          </>
        ) : (
          "Ustaw ilość z co najmniej jednego opakowania."
        )}
      </p>

      <div className="mt-3">
        {dose.exactTime === null ? (
          <button
            type="button"
            onClick={() => onChange({ exactTime: "" })}
            className="-mx-1 flex h-11 items-center gap-2 rounded-full px-1 text-meta font-semibold text-text"
          >
            <Clock aria-hidden className="size-4" />
            Dodaj dokładną godzinę
          </button>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <TextField
                  label="Dokładna godzina"
                  type="time"
                  value={dose.exactTime}
                  onChange={(e) => onChange({ exactTime: e.target.value })}
                />
              </div>
              <button
                type="button"
                onClick={() => onChange({ exactTime: null })}
                aria-label="Usuń godzinę"
                className="mb-1 grid size-11 shrink-0 place-items-center rounded-full text-text-2 active:scale-90"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <p className="mt-1.5 px-1 text-meta text-text-2">Lek pokaże się z tą godziną, a po niej przyjdzie przypomnienie.</p>
          </>
        )}
      </div>
    </fieldset>
  );
}
