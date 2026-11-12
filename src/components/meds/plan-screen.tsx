"use client";

import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadState } from "@/components/app-shell/load-state";
import { BackBar, FormError, primaryButton } from "@/components/ui/controls";
import { planPeriods } from "@/lib/data/meds";
import { useStore } from "@/lib/data/store";
import { useSave } from "@/lib/data/use-save";
import { shiftDay, shortDate } from "@/lib/dates";
import { activePeriod } from "@/lib/domain/checklist";
import { periodRange, sortedDoses } from "@/lib/domain/summary";
import type { AppData, DateKey, Medication } from "@/lib/domain/types";
import { draftKey, newDose } from "./dose-editor";
import { copyDoses, PlanEditor, planToPeriods, validatePlan, type PlanDraft } from "./plan-editor";

export function PlanScreen({ medId }: { medId: string }) {
  const { data, today, loadError, reload } = useStore();
  if (!data || !today) return <LoadState error={loadError} onRetry={reload} />;
  const med = data.medications.find((m) => m.id === medId);
  if (!med) {
    return (
      <div className="px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="px-1">
          <BackBar href="/leki" label="Leki" />
        </div>
        <p className="mt-6 rounded-[var(--radius-card)] bg-card-muted px-6 py-10 text-center text-body font-semibold">
          Nie znaleziono leku
        </p>
      </div>
    );
  }
  return <PlanForm med={med} data={data} today={today} />;
}

/** Dziś, chyba że dziś coś już odhaczono z tego leku (plan nie może zmieniać odhaczonych dni). */
function defaultStart(med: Medication, data: AppData, today: DateKey): DateKey {
  const doseIds = new Set(med.periods.flatMap((p) => p.doses.map((d) => d.id)));
  return data.intakes.some((i) => i.date >= today && doseIds.has(i.doseId)) ? shiftDay(today, 1) : today;
}

function PlanForm({ med, data, today }: { med: Medication; data: AppData; today: DateKey }) {
  const router = useRouter();
  const { run, pending, error } = useSave();
  const [localError, setLocalError] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanDraft>(() => {
    const from = defaultStart(med, data, today);
    // Pierwszy etap zaczyna od dawek obowiązujących w tym dniu (albo ostatnich znanych).
    const source = activePeriod(med, from) ?? [...med.periods].sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0];
    const doses = source && source.doses.length > 0
      ? copyDoses(sortedDoses(source, data.slots))
      : [newDose(med.form, med.packages, data.slots, [])];
    return { from, stages: [{ key: draftKey("stage"), to: null, doses }] };
  });

  const back = `/leki/${med.id}`;
  // Co plan zmieni w istniejącym dawkowaniu (podgląd przed zapisem).
  const shortened = plan.from
    ? med.periods.find((p) => p.validFrom < plan.from && (p.validTo === null || p.validTo >= plan.from))
    : undefined;
  const replaced = plan.from ? med.periods.filter((p) => p.validFrom >= plan.from) : [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    const planError = validatePlan(plan);
    if (planError) return setLocalError(planError);
    const r = await run((s) => planPeriods(s, med.id, planToPeriods(plan)));
    if (r.ok) router.push(back);
  }

  return (
    <div className="px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-8">
      <div className="px-1">
        <BackBar href={back} label={med.name} />
      </div>
      <p className="mt-2 px-1 text-meta font-semibold text-text-2">{med.name}</p>
      <h1 className="mt-0.5 px-1 font-rounded text-title font-bold tracking-[-0.02em]">Nowe dawkowanie</h1>
      <p className="mt-2 max-w-[46ch] px-1 text-meta text-text-2">
        Ustaw dawkę od wybranego dnia. Jeśli dawka ma się zmieniać w kolejnych terminach, dodaj następne etapy.
      </p>

      {(shortened || replaced.length > 0) && (
        <div className="mt-4 flex gap-2 rounded-[var(--radius-card)] bg-card-muted px-4 py-3 text-meta text-text-2">
          <Info aria-hidden className="mt-px size-4 shrink-0" />
          <ul className="space-y-1">
            {shortened && (
              <li>
                Obecne dawkowanie ({periodRange(shortened)}) skończy się {shortDate(shiftDay(plan.from, -1))}.
              </li>
            )}
            {replaced.length > 0 && (
              <li>
                {replaced.length === 1 ? "Zaplanowane dawkowanie" : "Zaplanowane dawkowania"}{" "}
                {replaced.map((p) => periodRange(p)).join(", ")} {replaced.length === 1 ? "zostanie zastąpione" : "zostaną zastąpione"} tym
                planem.
              </li>
            )}
          </ul>
        </div>
      )}

      <form onSubmit={submit} noValidate className="mt-4">
        <PlanEditor form={med.form} packages={med.packages} slots={data.slots} plan={plan} onChange={setPlan} />
        <div className="mt-4">
          <FormError message={localError ?? error} />
        </div>
        <button type="submit" disabled={pending} className={`${primaryButton} mt-2`}>
          {pending ? "Zapisywanie…" : plan.stages.length > 1 ? `Zapisz plan (${plan.stages.length} ${plan.stages.length < 5 ? "etapy" : "etapów"})` : "Zapisz dawkowanie"}
        </button>
      </form>
    </div>
  );
}
