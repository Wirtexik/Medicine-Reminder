"use client";

import { Plus, Trash2 } from "lucide-react";
import { CheckRow, outlineButton } from "@/components/ui/controls";
import { TextField } from "@/components/ui/text-field";
import type { DoseDraft, PeriodDraft } from "@/lib/data/meds";
import { dayDiff, longDate, shiftDay, shortDate } from "@/lib/dates";
import type { DateKey, MedForm, MedPackage, PeriodDose, TimeSlot } from "@/lib/domain/types";
import { DoseEditor, draftKey, validateDoses } from "./dose-editor";

/*
  Plan dawkowania z etapów, np. 40 mg przez tydzień → 30 mg przez tydzień → 20 mg do wizyty.
  Pierwszy etap zaczyna się w dniu `from`, każdy kolejny dzień po końcu poprzedniego.
  Tylko ostatni etap może nie mieć końca. Każdy etap zapisuje się jako osobny okres dawkowania.
*/

export interface StageDraft {
  key: string;
  /** Ostatni dzień etapu (włącznie); null: bez końca (tylko ostatni etap). */
  to: DateKey | null;
  doses: DoseDraft[];
}

export interface PlanDraft {
  from: DateKey;
  stages: StageDraft[];
}

const DURATIONS = [
  { days: 7, label: "Tydzień" },
  { days: 14, label: "2 tygodnie" },
  { days: 30, label: "30 dni" },
];

/** Kopia dawek do nowego etapu: te same pory i ilości, nowe klucze. */
export function copyDoses(doses: PeriodDose[]): DoseDraft[] {
  return doses.map((d) => ({ ...d, id: draftKey("dose"), isNew: true, parts: d.parts.map((p) => ({ ...p })) }));
}

/** Dzień początku każdego etapu. */
export function stageStarts(plan: PlanDraft): DateKey[] {
  const starts: DateKey[] = [];
  plan.stages.forEach((s, i) => {
    const prev = plan.stages[i - 1];
    starts.push(i === 0 ? plan.from : prev.to ? shiftDay(prev.to, 1) : starts[i - 1]);
  });
  return starts;
}

export function validatePlan(plan: PlanDraft): string | null {
  if (!plan.from) return "Podaj dzień początku.";
  const starts = stageStarts(plan);
  for (const [i, stage] of plan.stages.entries()) {
    const name = plan.stages.length > 1 ? `Etap ${i + 1}: ` : "";
    const last = i === plan.stages.length - 1;
    if (!last && !stage.to) return `${name}podaj ostatni dzień, żeby następny etap wiedział, kiedy się zaczyna.`;
    if (stage.to && stage.to < starts[i]) return `${name}koniec nie może być przed początkiem (${shortDate(starts[i])}).`;
    const doseError = validateDoses(stage.doses);
    if (doseError) return name + doseError.charAt(0).toLocaleLowerCase("pl-PL") + doseError.slice(1);
  }
  return null;
}

export function planToPeriods(plan: PlanDraft): PeriodDraft[] {
  const starts = stageStarts(plan);
  return plan.stages.map((s, i) => ({ validFrom: starts[i], validTo: s.to, doses: s.doses }));
}

function daysLabel(n: number): string {
  return n === 1 ? "1 dzień" : `${n} dni`;
}

export function PlanEditor({
  form,
  packages,
  slots,
  plan,
  onChange,
  fromLabel = "Od dnia",
}: {
  form: MedForm;
  packages: MedPackage[];
  slots: TimeSlot[];
  plan: PlanDraft;
  onChange: (plan: PlanDraft) => void;
  fromLabel?: string;
}) {
  const starts = stageStarts(plan);
  const multi = plan.stages.length > 1;
  const setStage = (key: string, patch: Partial<StageDraft>) =>
    onChange({ ...plan, stages: plan.stages.map((s) => (s.key === key ? { ...s, ...patch } : s)) });

  function addStage() {
    const last = plan.stages[plan.stages.length - 1];
    const lastStart = starts[starts.length - 1];
    // Ostatni etap bez końca dostaje tydzień, żeby następny miał gdzie się zacząć.
    const lastTo = last.to ?? shiftDay(lastStart, 6);
    onChange({
      ...plan,
      stages: [
        ...plan.stages.map((s) => (s.key === last.key ? { ...s, to: lastTo } : s)),
        { key: draftKey("stage"), to: null, doses: copyDoses(last.doses) },
      ],
    });
  }

  function removeStage(key: string) {
    const stages = plan.stages.filter((s) => s.key !== key);
    onChange({ ...plan, stages });
  }

  return (
    <div className="space-y-5">
      {plan.stages.map((stage, i) => {
        const start = starts[i];
        const last = i === plan.stages.length - 1;
        const length = stage.to && stage.to >= start ? dayDiff(stage.to, start) + 1 : null;
        return (
          <section key={stage.key} aria-label={multi ? `Etap ${i + 1}` : "Dawkowanie"} className="space-y-3">
            <div className="space-y-3 rounded-[var(--radius-card)] bg-card px-5 py-5">
              {multi && (
                <div className="-mt-1 flex min-h-11 items-center justify-between gap-2">
                  <h3 className="font-rounded text-slot font-bold">Etap {i + 1}</h3>
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => removeStage(stage.key)}
                      aria-label={`Usuń etap ${i + 1}`}
                      className="grid size-11 place-items-center rounded-full text-text-2 active:scale-90"
                    >
                      <Trash2 aria-hidden className="size-5" />
                    </button>
                  )}
                </div>
              )}

              {i === 0 ? (
                <TextField
                  label={fromLabel}
                  type="date"
                  value={plan.from}
                  onChange={(e) => onChange({ ...plan, from: e.target.value })}
                />
              ) : (
                <p className="px-1 text-body">
                  <span className="text-text-2">Od </span>
                  <span className="font-semibold">{longDate(start)}</span>
                  <span className="text-text-2"> (dzień po końcu etapu {i})</span>
                </p>
              )}

              {last && <CheckRow label="Do określonego dnia" checked={stage.to !== null} onChange={(v) => setStage(stage.key, { to: v ? shiftDay(start, 6) : null })} />}

              {stage.to !== null && (
                <>
                  <TextField
                    label="Do dnia (włącznie)"
                    type="date"
                    min={start}
                    value={stage.to}
                    onChange={(e) => setStage(stage.key, { to: e.target.value || stage.to })}
                    hint={length ? `${daysLabel(length)}, do ${longDate(stage.to)}` : undefined}
                  />
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Szybki wybór długości">
                    {DURATIONS.map((d) => {
                      const to = shiftDay(start, d.days - 1);
                      const on = stage.to === to;
                      return (
                        <button
                          key={d.days}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setStage(stage.key, { to })}
                          className={[
                            "h-11 rounded-full px-4 text-meta font-semibold",
                            on ? "bg-text text-ground" : "bg-card-muted text-text",
                          ].join(" ")}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {stage.to === null && <p className="px-1 text-meta text-text-2">Bez końca: do czasu, aż zmienisz dawkowanie.</p>}
            </div>

            <DoseEditor
              form={form}
              packages={packages}
              slots={slots}
              doses={stage.doses}
              onChange={(doses) => setStage(stage.key, { doses })}
            />
          </section>
        );
      })}

      <div className="space-y-1.5">
        <button type="button" onClick={addStage} className={outlineButton}>
          <Plus aria-hidden className="size-4" />
          Dodaj kolejny etap dawkowania
        </button>
        <p className="px-1 text-meta text-text-2">
          Np. przy schodzeniu z dawki: tydzień 40 mg, potem tydzień 30 mg, potem 20 mg. Nowy etap kopiuje dawki poprzedniego.
        </p>
      </div>
    </div>
  );
}
