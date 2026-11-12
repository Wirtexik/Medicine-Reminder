"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LoadState } from "@/components/app-shell/load-state";
import { BackBar, FormError, outlineButton, primaryButton } from "@/components/ui/controls";
import { TextArea, TextField } from "@/components/ui/text-field";
import { createMedication, type PackageDraft } from "@/lib/data/meds";
import { useStore } from "@/lib/data/store";
import { useSave } from "@/lib/data/use-save";
import { FORMS, hasStrength, parseNumber } from "@/lib/domain/forms";
import type { DateKey, MedForm, MedPackage } from "@/lib/domain/types";
import { draftKey, newDose } from "./dose-editor";
import { PlanEditor, planToPeriods, validatePlan, type PlanDraft, type StageDraft } from "./plan-editor";
import { emptyPackageForm, PackageFields, parsePackageForm, type PackageErrors, type PackageForm } from "./package-fields";

const STEPS = ["Nazwa i forma", "Opakowania", "Dawkowanie", "Opis"] as const;

interface PackageRow {
  key: string;
  value: PackageForm;
}

const newPackageRow = (): PackageRow => ({ key: draftKey("pkg"), value: emptyPackageForm() });

export function AddMedWizard() {
  const { data, today, loadError, reload } = useStore();
  const router = useRouter();
  const { run, pending, error: saveError } = useSave();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [form, setForm] = useState<MedForm>("tablet");
  const [packages, setPackages] = useState<PackageRow[]>(() => [newPackageRow()]);
  const [pkgErrors, setPkgErrors] = useState<Record<string, PackageErrors>>({});
  const [validFrom, setValidFrom] = useState<DateKey>("");
  const [stages, setStages] = useState<StageDraft[]>([]);
  const [description, setDescription] = useState("");
  const [threshold, setThreshold] = useState("");

  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  // Opakowania jako MedPackage z kluczem roboczym zamiast id: dla edytora dawek.
  const drafts = useMemo(
    () => packages.map((p) => ({ key: p.key, draft: parsePackageForm(form, p.value).draft })),
    [packages, form],
  );
  const editorPackages: MedPackage[] = drafts
    .filter((d): d is { key: string; draft: PackageDraft } => d.draft !== null)
    .map(({ key, draft }) => ({ id: key, ...draft }));

  if (!data || !today) return <LoadState error={loadError} onRetry={reload} />;

  const slots = data.slots;
  const plan: PlanDraft = { from: validFrom || today, stages };

  function chooseForm(next: MedForm) {
    if (next === form) return;
    setForm(next);
    setPackages([newPackageRow()]);
    setPkgErrors({});
    setStages([]);
  }

  function validateStep(): boolean {
    setError(null);
    if (step === 0) {
      if (!name.trim()) {
        setError("Podaj nazwę leku.");
        return false;
      }
    }
    if (step === 1) {
      const errors: Record<string, PackageErrors> = {};
      for (const p of packages) {
        const r = parsePackageForm(form, p.value);
        if (!r.draft) errors[p.key] = r.errors;
      }
      setPkgErrors(errors);
      if (Object.keys(errors).length > 0) {
        setError("Uzupełnij dane opakowań.");
        return false;
      }
      // Dawki mogą wskazywać tylko istniejące opakowania.
      const keys = new Set(packages.map((p) => p.key));
      const cleaned = stages.map((st) => ({
        ...st,
        doses: st.doses.map((d) => ({ ...d, parts: d.parts.filter((part) => keys.has(part.packageId)) })),
      }));
      setStages(
        cleaned.length > 0 ? cleaned : [{ key: draftKey("stage"), to: null, doses: [newDose(form, editorPackages, slots, [])] }],
      );
    }
    if (step === 2) {
      const planError = validatePlan(plan);
      if (planError) {
        setError(planError);
        return false;
      }
    }
    if (step === 3 && threshold.trim()) {
      const n = parseNumber(threshold);
      if (!Number.isInteger(n) || n < 1) {
        setError("Próg alertu to liczba dni, np. 7.");
        return false;
      }
    }
    return true;
  }

  async function next() {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    const keys = packages.map((p) => p.key);
    const result = await run((s) =>
      createMedication(
        s,
        {
          name: name.trim(),
          form,
          description: description.trim(),
          lowStockDays: threshold.trim() ? parseNumber(threshold) : null,
          packages: drafts.map((d) => d.draft!),
          periods: planToPeriods(plan),
        },
        keys,
      ),
    );
    if (result.ok) router.replace(`/leki/${result.value}`);
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  const shownError = error ?? saveError;

  return (
    <div className="px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-8">
      <div className="px-1">
        <BackBar href="/leki" label="Leki" />
      </div>
      <p className="mt-2 px-1 text-meta font-semibold text-text-2">
        Nowy lek · krok {step + 1} z {STEPS.length}
      </p>
      <h1 ref={headingRef} tabIndex={-1} className="mt-0.5 px-1 font-rounded text-title font-bold tracking-[-0.02em] outline-none">
        {STEPS[step]}
      </h1>

      <form
        className="mt-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void next();
        }}
      >
        {step === 0 && (
          <div className="space-y-5">
            <div className="rounded-[var(--radius-card)] bg-card px-5 py-5">
              <TextField
                label="Nazwa"
                autoComplete="off"
                autoCapitalize="sentences"
                placeholder="np. Euthyrox"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <fieldset>
              <legend className="px-1 text-body font-bold">Forma</legend>
              <div role="radiogroup" aria-label="Forma" className="mt-2 grid grid-cols-2 gap-2">
                {FORMS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    role="radio"
                    aria-checked={form === f.value}
                    onClick={() => chooseForm(f.value)}
                    className={[
                      "flex min-h-24 flex-col items-start rounded-[var(--radius-card)] bg-card px-4 py-3 text-left",
                      form === f.value ? "ring-2 ring-text ring-inset" : "",
                    ].join(" ")}
                  >
                    <span className="font-rounded text-body font-semibold">{f.label}</span>
                    <span className="mt-1 text-meta text-text-2">{f.hint}</span>
                  </button>
                ))}
              </div>
              {packages.some((p) => p.value.size || p.value.strength) && (
                <p className="mt-2 px-1 text-meta text-text-2">Zmiana formy wyczyści wpisane opakowania i dawki.</p>
              )}
            </fieldset>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            {hasStrength(form) && (
              <p className="px-1 text-meta text-text-2">
                Jeśli dawkę składasz z tabletek o różnej mocy (np. 20 mg i 10 mg), dodaj każdą moc osobno.
              </p>
            )}
            {packages.map((p, i) => (
              <fieldset key={p.key} className="rounded-[var(--radius-card)] bg-card px-5 pt-4 pb-5">
                <legend className="sr-only">{hasStrength(form) ? `Moc ${i + 1}` : "Butelka"}</legend>
                <div className="flex min-h-11 items-center justify-between">
                  <span aria-hidden className="text-body font-bold">
                    {hasStrength(form) ? `Moc ${packages.length > 1 ? i + 1 : ""}`.trim() : "Butelka"}
                  </span>
                  {packages.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Usuń moc ${i + 1}`}
                      onClick={() => setPackages(packages.filter((x) => x.key !== p.key))}
                      className="grid size-11 place-items-center rounded-full text-text-2 active:scale-90"
                    >
                      <Trash2 aria-hidden className="size-5" />
                    </button>
                  )}
                </div>
                <div className="mt-2">
                  <PackageFields
                    form={form}
                    value={p.value}
                    errors={pkgErrors[p.key]}
                    onChange={(value) => setPackages(packages.map((x) => (x.key === p.key ? { ...x, value } : x)))}
                  />
                </div>
              </fieldset>
            ))}
            {hasStrength(form) && (
              <button type="button" onClick={() => setPackages([...packages, newPackageRow()])} className={outlineButton}>
                <Plus aria-hidden className="size-4" />
                Dodaj inną moc
              </button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <PlanEditor
              form={form}
              packages={editorPackages}
              slots={slots}
              plan={plan}
              onChange={(p) => {
                setValidFrom(p.from);
                setStages(p.stages);
              }}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 rounded-[var(--radius-card)] bg-card px-5 py-5">
            <TextArea
              label="Opis (opcjonalnie)"
              placeholder="np. Na czczo, popić wodą."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <TextField
              label="Alert zapasu (dni)"
              inputMode="numeric"
              autoComplete="off"
              placeholder={String(data.defaultLowStockDays)}
              hint={`Ostrzeżenie, gdy zapas wystarczy na tyle dni lub mniej. Puste: domyślnie ${data.defaultLowStockDays}.`}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
        )}

        <div className="mt-4">
          <FormError message={shownError} />
        </div>
        <div className="mt-2 flex gap-2">
          {step > 0 && (
            <button type="button" onClick={back} className={`${outlineButton} h-[3.25rem] flex-1 text-body`}>
              Wstecz
            </button>
          )}
          <button type="submit" disabled={pending} className={`${primaryButton} flex-[2]`}>
            {step < STEPS.length - 1 ? "Dalej" : pending ? "Zapisywanie…" : "Zapisz lek"}
          </button>
        </div>
      </form>
    </div>
  );
}
