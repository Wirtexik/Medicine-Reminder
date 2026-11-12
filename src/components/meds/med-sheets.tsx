"use client";

import { useState } from "react";
import { FormError, outlineButton, primaryButton } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/sheet";
import { TextArea, TextField } from "@/components/ui/text-field";
import { deletePackage, savePackage, updateMedication } from "@/lib/data/meds";
import { useSave } from "@/lib/data/use-save";
import { packageName, parseNumber } from "@/lib/domain/forms";
import type { Medication, MedPackage } from "@/lib/domain/types";
import { emptyPackageForm, PackageFields, packageFormFrom, parsePackageForm, type PackageErrors } from "./package-fields";

function SheetTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-rounded text-slot font-bold">{children}</h2>;
}

/** Nazwa, opis i próg alertu. Forma leku jest stała (od niej zależą jednostki opakowań). */
export function MedInfoSheet({
  med,
  defaultThreshold,
  open,
  onOpenChange,
}: {
  med: Medication;
  defaultThreshold: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Edycja leku">
      {open && <MedInfoForm med={med} defaultThreshold={defaultThreshold} onDone={() => onOpenChange(false)} />}
    </Sheet>
  );
}

function MedInfoForm({ med, defaultThreshold, onDone }: { med: Medication; defaultThreshold: number; onDone: () => void }) {
  const { run, pending, error } = useSave();
  const [name, setName] = useState(med.name);
  const [description, setDescription] = useState(med.description);
  const [threshold, setThreshold] = useState(med.lowStockDays === null ? "" : String(med.lowStockDays));
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!name.trim()) return setLocalError("Podaj nazwę leku.");
    const days = threshold.trim() ? parseNumber(threshold) : null;
    if (days !== null && (!Number.isInteger(days) || days < 1)) return setLocalError("Próg alertu to liczba dni, np. 7.");
    const r = await run((s) => updateMedication(s, med.id, { name: name.trim(), description: description.trim(), lowStockDays: days }));
    if (r.ok) onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 pb-2">
      <SheetTitle>Edycja leku</SheetTitle>
      <TextField label="Nazwa" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
      <TextArea label="Opis" value={description} onChange={(e) => setDescription(e.target.value)} />
      <TextField
        label="Alert zapasu (dni)"
        inputMode="numeric"
        autoComplete="off"
        placeholder={String(defaultThreshold)}
        hint={`Ostrzeżenie, gdy zapas wystarczy na tyle dni lub mniej. Puste: domyślnie ${defaultThreshold}.`}
        value={threshold}
        onChange={(e) => setThreshold(e.target.value)}
      />
      <FormError message={localError ?? error} />
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Zapisywanie…" : "Zapisz"}
      </button>
    </form>
  );
}

/** Dodanie (pkg = null) albo zmiana opakowania. Zmiana stanu zapisuje się jako korekta. */
export function PackageSheet({
  med,
  pkg,
  open,
  onOpenChange,
}: {
  med: Medication;
  pkg: MedPackage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={pkg ? "Opakowanie" : "Nowe opakowanie"}>
      {open && <PackageForm med={med} pkg={pkg} onDone={() => onOpenChange(false)} />}
    </Sheet>
  );
}

function PackageForm({ med, pkg, onDone }: { med: Medication; pkg: MedPackage | null; onDone: () => void }) {
  const { run, pending, error } = useSave();
  const [value, setValue] = useState(() => (pkg ? packageFormFrom(pkg) : emptyPackageForm()));
  const [errors, setErrors] = useState<PackageErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const used = pkg ? med.periods.some((p) => p.doses.some((d) => d.parts.some((part) => part.packageId === pkg.id))) : false;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { draft, errors } = parsePackageForm(med.form, value);
    setErrors(errors);
    if (!draft) return;
    // Stan zmieniony tylko wtedy, gdy różni się od obecnego (inaczej bez ruchu korekty).
    const stock = pkg && Math.abs(draft.stock - pkg.stock) < 0.001 ? null : draft.stock;
    const r = await run((s) => savePackage(s, med.id, pkg?.id ?? null, { ...draft, stock }));
    if (r.ok) onDone();
  }

  async function remove() {
    if (!pkg) return;
    const r = await run((s) => deletePackage(s, pkg.id));
    if (r.ok) onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 pb-2">
      <SheetTitle>{pkg ? packageName(pkg) : "Nowe opakowanie"}</SheetTitle>
      <PackageFields form={med.form} value={value} onChange={setValue} errors={errors} />
      <FormError message={error} />
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Zapisywanie…" : "Zapisz"}
      </button>
      {pkg && med.packages.length > 1 && (
        <>
          {used ? (
            <p className="px-1 text-meta text-text-2">
              To opakowanie jest używane w dawkowaniu, więc nie można go usunąć. Najpierw zmień dawki.
            </p>
          ) : confirmDelete ? (
            <div className="space-y-2">
              <p className="px-1 text-meta text-text-2">Usunąć to opakowanie razem z historią jego stanu?</p>
              <button type="button" disabled={pending} onClick={remove} className={outlineButton}>
                Tak, usuń opakowanie
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className={outlineButton}>
              Usuń opakowanie
            </button>
          )}
        </>
      )}
    </form>
  );
}

