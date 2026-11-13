"use client";

import { ChevronRight, Pill, Plus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { LoadState } from "@/components/app-shell/load-state";
import { useStore } from "@/lib/data/store";
import { shortDate } from "@/lib/dates";
import { forecastMedication, type MedForecast } from "@/lib/domain/forecast";
import { currentDosing } from "@/lib/domain/summary";
import type { AppData, DateKey, Medication } from "@/lib/domain/types";
import { primaryPill } from "@/components/ui/buttons";

export function MedsScreen() {
  const { data, today, loadError, reload } = useStore();

  const { active, archived } = useMemo(() => {
    const meds = data?.medications ?? [];
    return { active: meds.filter((m) => !m.isArchived), archived: meds.filter((m) => m.isArchived) };
  }, [data]);

  if (!data || !today) return <LoadState error={loadError} onRetry={reload} />;

  return (
    <div className="px-4 pt-[max(3.25rem,calc(env(safe-area-inset-top)+2.75rem))] pb-8">
      <header className="flex flex-wrap items-end justify-between gap-3 px-1">
        <h1 className="font-rounded text-title font-bold tracking-[-0.02em]">Leki</h1>
        {active.length > 0 && (
          <Link
            href="/leki/nowy"
            className="flex h-11 items-center gap-1.5 rounded-full bg-action pr-4 pl-3 text-body font-semibold text-on-action transition-transform duration-150 active:scale-[0.98] active:bg-action-press"
          >
            <Plus aria-hidden className="size-5" />
            Dodaj lek
          </Link>
        )}
      </header>

      {active.length === 0 ? (
        <EmptyMeds hasArchived={archived.length > 0} />
      ) : (
        <ul className="mt-5 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-card">
          {active.map((med) => (
            <MedRow key={med.id} med={med} data={data} today={today} />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <details className="group mt-6">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-2 px-1 text-body font-semibold text-text-2 [&::-webkit-details-marker]:hidden">
            <ChevronRight aria-hidden className="size-5 transition-transform duration-300 group-open:rotate-90" />
            Zarchiwizowane · {archived.length}
          </summary>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-card-muted">
            {archived.map((med) => (
              <MedRow key={med.id} med={med} data={data} today={today} archived />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function MedRow({ med, data, today, archived }: { med: Medication; data: AppData; today: DateKey; archived?: boolean }) {
  const forecast = useMemo(() => (archived ? null : forecastMedication(data, med, today)), [archived, data, med, today]);
  return (
    <li>
      <Link href={`/leki/${med.id}`} className="flex min-h-[4.25rem] items-center gap-3 px-5 py-3 active:bg-card-muted">
        <span className="min-w-0 flex-1">
          <span className={["block font-rounded text-med font-semibold tracking-[-0.01em]", archived ? "text-text-2" : ""].join(" ")}>
            {med.name}
          </span>
          <span className="mt-0.5 block text-meta text-text-2">
            {archived ? "zarchiwizowany" : currentDosing(med, data.slots, today)}
          </span>
        </span>
        {forecast && <StockNote forecast={forecast} />}
        <ChevronRight aria-hidden className="size-5 shrink-0 text-text-3" />
      </Link>
    </li>
  );
}

function StockNote({ forecast }: { forecast: MedForecast }) {
  const last = forecast.weakest?.lastDay;
  if (!last) return null;
  if (forecast.isLow) {
    return (
      <span className="flex shrink-0 items-center gap-1 text-right text-meta font-semibold text-warn">
        <TriangleAlert aria-hidden className="size-4" />
        <span>
          <span className="sr-only">Kończy się, </span>do ~{shortDate(last)}
        </span>
      </span>
    );
  }
  return <span className="shrink-0 text-right text-meta text-text-2">starczy do ~{shortDate(last)}</span>;
}

function EmptyMeds({ hasArchived }: { hasArchived: boolean }) {
  return (
    <div className="mt-5 flex flex-col items-center rounded-[var(--radius-card)] bg-card-muted px-6 py-10 text-center">
      <Pill aria-hidden className="size-8 text-text-3" />
      <p className="mt-3 text-body font-semibold">{hasArchived ? "Brak leków w użyciu" : "Nie masz jeszcze leków"}</p>
      <p className="mt-1 max-w-[32ch] text-meta text-text-2">
        Dodaj lek z opakowaniami i dawkowaniem. Pojawi się na liście „Dziś” w swoich porach dnia.
      </p>
      <Link
        href="/leki/nowy"
        className={`mt-5 ${primaryPill}`}
      >
        <Plus aria-hidden className="size-5" />
        Dodaj lek
      </Link>
    </div>
  );
}
