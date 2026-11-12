"use client";

import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadState } from "@/components/app-shell/load-state";
import { BackBar, CheckRow, FormError, outlineButton, primaryButton } from "@/components/ui/controls";
import { TextField } from "@/components/ui/text-field";
import { deletePeriod, savePeriod, type DoseDraft } from "@/lib/data/meds";
import { useStore } from "@/lib/data/store";
import { useSave } from "@/lib/data/use-save";
import { shortDate } from "@/lib/dates";
import { periodPhase, periodRange, sortedDoses } from "@/lib/domain/summary";
import type { AppData, DateKey, DosingPeriod, Medication } from "@/lib/domain/types";
import { DoseEditor, newDose, validateDoses } from "./dose-editor";

export function PeriodScreen({ medId, periodId }: { medId: string; periodId: string }) {
  const { data, today, loadError, reload } = useStore();
  const [leaving, setLeaving] = useState(false);

  if (!data || !today || leaving) return <LoadState error={loadError} onRetry={reload} />;
  const med = data.medications.find((m) => m.id === medId);
  const period = med?.periods.find((p) => p.id === periodId);
  if (!med || !period) {
    return (
      <div className="px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="px-1">
          <BackBar href={med ? `/leki/${med.id}` : "/leki"} label={med?.name ?? "Leki"} />
        </div>
        <p className="mt-6 rounded-[var(--radius-card)] bg-card-muted px-6 py-10 text-center text-body font-semibold">
          Nie znaleziono okresu dawkowania
        </p>
      </div>
    );
  }
  return <PeriodEditor key={period.id} med={med} period={period} data={data} today={today} onLeave={() => setLeaving(true)} />;
}

/** Czy okres [from, to] nachodzi na inny okres leku (to = null: bez końca). */
function overlapping(med: Medication, selfId: string, from: DateKey, to: DateKey | null): DosingPeriod | undefined {
  return med.periods.find(
    (p) => p.id !== selfId && from <= (p.validTo ?? "9999-12-31") && (to ?? "9999-12-31") >= p.validFrom,
  );
}

function PeriodEditor({
  med,
  period,
  data,
  today,
  onLeave,
}: {
  med: Medication;
  period: DosingPeriod;
  data: AppData;
  today: DateKey;
  onLeave: () => void;
}) {
  const router = useRouter();
  const { run, pending, error } = useSave();
  const [from, setFrom] = useState(period.validFrom);
  const [hasEnd, setHasEnd] = useState(period.validTo !== null);
  const [to, setTo] = useState(period.validTo ?? "");
  // Nowy okres bez poprzednika nie ma dawek: od razu jedna do ustawienia.
  const [doses, setDoses] = useState<DoseDraft[]>(() =>
    period.doses.length > 0
      ? sortedDoses(period, data.slots).map((d) => ({ ...d, isNew: false }))
      : [newDose(med.form, med.packages, data.slots, [])],
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const back = `/leki/${med.id}`;
  const startedBefore = period.validFrom < today;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!from) return setLocalError("Podaj dzień początku.");
    if (hasEnd && (!to || to < from)) return setLocalError("Data końca musi być taka sama jak początek albo późniejsza.");
    const end = hasEnd ? to : null;
    const clash = overlapping(med, period.id, from, end);
    if (clash) {
      return setLocalError(`Ten zakres nachodzi na inny okres dawkowania (${periodRange(clash)}). Zmień daty któregoś z nich.`);
    }
    const doseError = validateDoses(doses);
    if (doseError) return setLocalError(doseError);
    const r = await run((s) => savePeriod(s, period.id, from, end, doses));
    if (r.ok) router.push(back);
  }

  async function remove() {
    const r = await run((s) => deletePeriod(s, period.id));
    if (r.ok) {
      onLeave();
      router.replace(back);
    }
  }

  return (
    <div className="px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-8">
      <div className="px-1">
        <BackBar href={back} label={med.name} />
      </div>
      <p className="mt-2 px-1 text-meta font-semibold text-text-2">{med.name}</p>
      <h1 className="mt-0.5 px-1 font-rounded text-title font-bold tracking-[-0.02em]">Dawkowanie {periodRange(period)}</h1>

      {startedBefore && periodPhase(period, today) !== "future" && (
        <p className="mt-4 flex gap-2 rounded-[var(--radius-card)] bg-card-muted px-4 py-3 text-meta text-text-2">
          <Info aria-hidden className="mt-px size-4 shrink-0" />
          <span>
            Zmiana dawek dotyczy całego okresu, także dni przed dziś. Żeby zmienić dawkę od wybranego dnia, wróć i użyj
            „Od dnia… nowe dawkowanie”.
          </span>
        </p>
      )}

      <form onSubmit={submit} noValidate className="mt-4 space-y-3">
        <div className="space-y-3 rounded-[var(--radius-card)] bg-card px-5 py-5">
          <TextField label="Od dnia" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <CheckRow label="Do określonego dnia" checked={hasEnd} onChange={setHasEnd} />
          {hasEnd ? (
            <TextField label="Do dnia (włącznie)" type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} />
          ) : (
            <p className="px-1 text-meta text-text-2">Bez końca{from ? `, od ${shortDate(from)}` : ""}.</p>
          )}
        </div>

        <DoseEditor form={med.form} packages={med.packages} slots={data.slots} doses={doses} onChange={setDoses} />

        <div className="pt-2">
          <FormError message={localError ?? error} />
        </div>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? "Zapisywanie…" : "Zapisz dawkowanie"}
        </button>
      </form>

      <div className="mt-6 space-y-2">
        {confirmDelete ? (
          <>
            <p className="px-1 text-meta text-text-2">
              Usunąć ten okres? Da się to zrobić tylko, gdy nie ma w nim odhaczonych dawek.
            </p>
            <button type="button" disabled={pending} onClick={remove} className={outlineButton}>
              Tak, usuń okres
            </button>
          </>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="h-11 px-1 text-meta font-semibold text-text-2">
            Usuń okres
          </button>
        )}
      </div>
    </div>
  );
}
