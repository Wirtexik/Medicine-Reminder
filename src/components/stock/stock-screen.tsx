"use client";

import { ChevronRight, Package, Plus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LoadState } from "@/components/app-shell/load-state";
import { SectionTitle } from "@/components/ui/controls";
import { useStore } from "@/lib/data/store";
import { formatNumber, packageLabel, unitFor } from "@/lib/domain/format";
import { forecastMedication, type MedForecast } from "@/lib/domain/forecast";
import { packageName, packageSizeLabel } from "@/lib/domain/forms";
import { forecastText, StockForecastLine } from "./stock-forecast";
import { StockSheet, type StockTarget } from "./stock-sheet";

/** Najpilniejsze najpierw; leki bez końca zapasu na końcu, alfabetycznie. */
function byUrgency(a: MedForecast, b: MedForecast): number {
  const da = a.weakest?.daysLeft ?? Infinity;
  const db = b.weakest?.daysLeft ?? Infinity;
  return da === db ? a.med.name.localeCompare(b.med.name, "pl") : da - db;
}

export function StockScreen() {
  const { data, today, loadError, reload } = useStore();
  const [target, setTarget] = useState<StockTarget | null>(null);

  const forecasts = useMemo(() => {
    if (!data || !today) return [];
    return data.medications
      .filter((m) => !m.isArchived)
      .map((m) => forecastMedication(data, m, today))
      .sort(byUrgency);
  }, [data, today]);

  if (!data || !today) return <LoadState error={loadError} onRetry={reload} />;

  const low = forecasts.filter((f) => f.isLow);
  const open = (medId: string, pkgId: string) => setTarget({ medId, pkgId });

  return (
    <div className="px-4 pt-[max(3.25rem,calc(env(safe-area-inset-top)+2.75rem))] pb-8">
      <h1 className="px-1 font-rounded text-title font-bold tracking-[-0.02em]">Zapasy</h1>

      {forecasts.length === 0 ? (
        <EmptyStock />
      ) : (
        <>
          {low.length > 0 && (
            <section aria-labelledby="sec-low" className="mt-5">
              <SectionTitle id="sec-low">Kończą się</SectionTitle>
              <ul className="mt-2 space-y-2">
                {low.map((f) => (
                  <LowRow key={f.med.id} forecast={f} onOpen={open} />
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="sec-all" className="mt-7">
            <SectionTitle id="sec-all">Wszystkie leki</SectionTitle>
            <ul className="mt-2 space-y-3">
              {forecasts.map((f) => (
                <MedStockCard key={f.med.id} forecast={f} onOpen={open} />
              ))}
            </ul>
          </section>
        </>
      )}

      <StockSheet target={target} data={data} today={today} onClose={() => setTarget(null)} />
    </div>
  );
}

/** Lek poniżej progu: dotknięcie otwiera najsłabsze opakowanie (to je trzeba dokupić). */
function LowRow({ forecast, onOpen }: { forecast: MedForecast; onOpen: (medId: string, pkgId: string) => void }) {
  const { med, weakest } = forecast;
  if (!weakest) return null;
  const name = med.packages.length > 1 ? `${med.name} ${packageLabel(weakest.pkg)}` : med.name;
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(med.id, weakest.pkg.id)}
        className="flex min-h-[3.75rem] w-full items-center gap-3 rounded-[var(--radius-card)] bg-warn-soft px-4 py-3 text-left active:opacity-80"
      >
        <TriangleAlert aria-hidden className="size-6 shrink-0 text-warn" strokeWidth={2.25} />
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold text-text">{name}</span>
          <span className="block text-meta text-text-2">
            {forecastText(weakest)}, masz {formatNumber(weakest.pkg.stock)} {unitFor(weakest.pkg.stock, weakest.pkg.unitLabel)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-meta font-semibold text-text">
          <Plus aria-hidden className="size-4" />
          Uzupełnij
        </span>
      </button>
    </li>
  );
}

function MedStockCard({ forecast, onOpen }: { forecast: MedForecast; onOpen: (medId: string, pkgId: string) => void }) {
  const { med, packages, weakest, threshold } = forecast;
  const multi = packages.length > 1;
  return (
    <li className="overflow-hidden rounded-[var(--radius-card)] bg-card">
      <div className="px-5 pt-4 pb-1">
        <h3 className="font-rounded text-med font-semibold tracking-[-0.01em]">{med.name}</h3>
        {multi && weakest && (
          <p className="text-meta text-text-2">
            Najszybciej skończy się {packageName(weakest.pkg)}: {forecastText(weakest)}
          </p>
        )}
      </div>
      <ul className="divide-y divide-line">
        {packages.map((f) => (
          <li key={f.pkg.id}>
            <button
              type="button"
              onClick={() => onOpen(med.id, f.pkg.id)}
              className="flex min-h-[4rem] w-full items-center gap-3 px-5 py-3 text-left active:bg-card-muted"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold">{packageName(f.pkg)}</span>
                <span className="block text-meta text-text-2">{packageSizeLabel(f.pkg)}</span>
              </span>
              <span className="text-right">
                <span className="block text-body font-semibold whitespace-nowrap">
                  {formatNumber(f.pkg.stock)} {unitFor(f.pkg.stock, f.pkg.unitLabel)}
                </span>
                <StockForecastLine forecast={f} threshold={threshold} />
              </span>
              <ChevronRight aria-hidden className="size-5 shrink-0 text-text-3" />
            </button>
          </li>
        ))}
      </ul>
    </li>
  );
}

function EmptyStock() {
  return (
    <div className="mt-5 flex flex-col items-center rounded-[var(--radius-card)] bg-card-muted px-6 py-10 text-center">
      <Package aria-hidden className="size-8 text-text-3" />
      <p className="mt-3 text-body font-semibold">Brak leków w użyciu</p>
      <p className="mt-1 max-w-[32ch] text-meta text-text-2">
        Zapasy liczą się z opakowań i dawkowania leków. Dodaj lek, a zobaczysz tu, na ile dni wystarczy.
      </p>
      <Link
        href="/leki/nowy"
        className="mt-5 flex h-12 items-center gap-2 rounded-full bg-action px-6 text-body font-semibold text-on-action active:bg-action-press"
      >
        <Plus aria-hidden className="size-5" />
        Dodaj lek
      </Link>
    </div>
  );
}
