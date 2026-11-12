"use client";

import { Archive, ArchiveRestore, CalendarPlus, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoadState } from "@/components/app-shell/load-state";
import { BackBar, FormError, outlineButton, SectionTitle } from "@/components/ui/controls";
import { deleteMedication, updateMedication } from "@/lib/data/meds";
import { useStore } from "@/lib/data/store";
import { useSave } from "@/lib/data/use-save";
import { shortDate } from "@/lib/dates";
import { formatNumber, doseBreakdown, doseTotal } from "@/lib/domain/format";
import { forecastMedication } from "@/lib/domain/forecast";
import { FORM_LABEL, packageName, packageSizeLabel } from "@/lib/domain/forms";
import { periodPhase, periodRange, sortedDoses, type PeriodPhase } from "@/lib/domain/summary";
import type { AppData, DateKey, DosingPeriod, Medication, MedPackage } from "@/lib/domain/types";
import { MedInfoSheet, PackageSheet } from "./med-sheets";

const PHASE_LABEL: Record<PeriodPhase, string> = { past: "Wcześniej", current: "Teraz", future: "Potem" };
/** Ile minionych okresów widać bez rozwijania. */
const PAST_VISIBLE = 1;

export function MedDetailScreen({ id }: { id: string }) {
  const { data, today, loadError, reload } = useStore();
  const [leaving, setLeaving] = useState(false);

  if (!data || !today || leaving) return <LoadState error={loadError} onRetry={reload} />;
  const med = data.medications.find((m) => m.id === id);
  if (!med) return <NotFound />;
  return <MedDetail med={med} data={data} today={today} onDeleted={() => setLeaving(true)} />;
}

function NotFound() {
  return (
    <div className="px-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="px-1">
        <BackBar href="/leki" label="Leki" />
      </div>
      <div className="mt-6 rounded-[var(--radius-card)] bg-card-muted px-6 py-10 text-center">
        <p className="text-body font-semibold">Nie znaleziono leku</p>
        <p className="mt-1 text-meta text-text-2">Mógł zostać usunięty na innym urządzeniu.</p>
      </div>
    </div>
  );
}

function MedDetail({ med, data, today, onDeleted }: { med: Medication; data: AppData; today: DateKey; onDeleted: () => void }) {
  const router = useRouter();
  const { run, pending, error } = useSave();
  const [infoOpen, setInfoOpen] = useState(false);
  const [pkgSheet, setPkgSheet] = useState<{ pkg: MedPackage | null } | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const forecast = forecastMedication(data, med, today);
  const threshold = med.lowStockDays ?? data.defaultLowStockDays;

  const periods = [...med.periods].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
  const past = periods.filter((p) => periodPhase(p, today) === "past");
  const hiddenPast = showPast ? 0 : Math.max(0, past.length - PAST_VISIBLE);
  const visible = periods.slice(hiddenPast);


  async function toggleArchive() {
    await run((s) => updateMedication(s, med.id, { isArchived: !med.isArchived }));
  }

  async function remove() {
    const r = await run((s) => deleteMedication(s, med.id));
    if (r.ok) {
      onDeleted();
      router.replace("/leki");
    }
  }

  return (
    <div className="px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-8">
      <div className="px-1">
        <BackBar href="/leki" label="Leki">
          <button type="button" onClick={() => setInfoOpen(true)} className="h-11 rounded-full px-3 text-body font-medium">
            Edytuj
          </button>
        </BackBar>
      </div>

      <header className="mt-2 px-1">
        <p className="text-meta font-semibold text-text-2">
          {FORM_LABEL[med.form]}
          {med.isArchived && " · zarchiwizowany"}
        </p>
        <h1 className="mt-0.5 font-rounded text-title font-bold tracking-[-0.02em] break-words">{med.name}</h1>
        {med.description ? (
          <p className="mt-3 max-w-[60ch] text-body whitespace-pre-line">{med.description}</p>
        ) : (
          <button type="button" onClick={() => setInfoOpen(true)} className="mt-2 h-11 text-meta font-semibold text-text-2">
            + Dodaj opis
          </button>
        )}
      </header>

      <section aria-labelledby="sec-pkg" className="mt-6">
        <SectionTitle id="sec-pkg">Opakowania</SectionTitle>
        <ul className="mt-2 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] bg-card">
          {forecast.packages.map(({ pkg, lastDay, daysLeft }) => (
            <li key={pkg.id}>
              <button
                type="button"
                onClick={() => setPkgSheet({ pkg })}
                className="flex min-h-[4.25rem] w-full items-center gap-3 px-5 py-3 text-left active:bg-card-muted"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-body font-semibold">{packageName(pkg)}</span>
                  <span className="block text-meta text-text-2">{packageSizeLabel(pkg)}</span>
                </span>
                <span className="text-right">
                  <span className="block text-body font-semibold whitespace-nowrap">
                    {formatNumber(pkg.stock)}
                    {" "}
                    {pkg.unitLabel}
                  </span>
                  {lastDay && (
                    <span
                      className={[
                        "block text-meta",
                        daysLeft !== null && daysLeft <= threshold ? "font-semibold text-warn" : "text-text-2",
                      ].join(" ")}
                    >
                      starczy do ~{shortDate(lastDay)}
                    </span>
                  )}
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-text-3" />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setPkgSheet({ pkg: null })} className={`${outlineButton} mt-3`}>
          <Plus aria-hidden className="size-4" />
          Dodaj opakowanie
        </button>
      </section>

      <section aria-labelledby="sec-dosing" className="mt-7">
        <SectionTitle id="sec-dosing">Dawkowanie</SectionTitle>
        {hiddenPast > 0 && (
          <button type="button" onClick={() => setShowPast(true)} className="mt-1 h-11 px-1 text-meta font-semibold text-text-2">
            Pokaż wcześniejsze ({hiddenPast})
          </button>
        )}
        {periods.length === 0 ? (
          <p className="mt-2 rounded-[var(--radius-card)] bg-card-muted px-5 py-4 text-meta text-text-2">
            Lek nie ma dawkowania, więc nie pojawia się na liście „Dziś”.
          </p>
        ) : (
          <ol className="mt-2 space-y-2">
            {visible.map((p) => (
              <PeriodCard key={p.id} med={med} period={p} data={data} phase={periodPhase(p, today)} />
            ))}
          </ol>
        )}
        {!med.isArchived && (
          <>
            <Link href={`/leki/${med.id}/plan`} className={`${outlineButton} mt-3`}>
              <CalendarPlus aria-hidden className="size-4" />
              {periods.length > 0 ? "Od dnia… nowe dawkowanie" : "Dodaj dawkowanie"}
            </Link>
            <p className="mt-1.5 px-1 text-meta text-text-2">Także plan zmian, np. schodzenie z dawki tydzień po tygodniu.</p>
          </>
        )}
      </section>

      <section aria-labelledby="sec-alert" className="mt-7">
        <SectionTitle id="sec-alert">Alert zapasu</SectionTitle>
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          className="mt-2 flex min-h-14 w-full items-center gap-3 rounded-[var(--radius-card)] bg-card px-5 py-3 text-left"
        >
          <span className="flex-1 text-body">
            Gdy zapas wystarczy na {threshold} {threshold === 1 ? "dzień" : "dni"} lub mniej
            {med.lowStockDays === null && <span className="text-text-2"> (domyślnie)</span>}
          </span>
          <ChevronRight aria-hidden className="size-5 shrink-0 text-text-3" />
        </button>
      </section>

      <section className="mt-8 space-y-2">
        <FormError message={error} />
        <button type="button" disabled={pending} onClick={toggleArchive} className={outlineButton}>
          {med.isArchived ? <ArchiveRestore aria-hidden className="size-4" /> : <Archive aria-hidden className="size-4" />}
          {med.isArchived ? "Przywróć lek" : "Archiwizuj lek"}
        </button>
        <p className="px-1 text-meta text-text-2">
          {med.isArchived
            ? "Lek wróci na listę „Dziś” w dniach swojego dawkowania."
            : "Zarchiwizowany lek znika z list, a jego historia zostaje."}
        </p>
        {confirmDelete ? (
          <div className="space-y-2 pt-2">
            <p className="px-1 text-meta text-text-2">Usunąć lek na zawsze? Da się to zrobić tylko, gdy nie ma historii przyjęć.</p>
            <button type="button" disabled={pending} onClick={remove} className={outlineButton}>
              Tak, usuń lek
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="h-11 px-1 text-meta font-semibold text-text-2">
            Usuń lek
          </button>
        )}
      </section>

      <MedInfoSheet med={med} defaultThreshold={data.defaultLowStockDays} open={infoOpen} onOpenChange={setInfoOpen} />
      <PackageSheet
        med={med}
        pkg={pkgSheet?.pkg ?? null}
        open={pkgSheet !== null}
        onOpenChange={(o) => !o && setPkgSheet(null)}
      />
    </div>
  );
}

function PeriodCard({ med, period, data, phase }: { med: Medication; period: DosingPeriod; data: AppData; phase: PeriodPhase }) {
  const slotName = (id: string) => data.slots.find((s) => s.id === id)?.name ?? "";
  const doses = sortedDoses(period, data.slots);
  return (
    <li>
      <Link
        href={`/leki/${med.id}/okres/${period.id}`}
        className={[
          "flex items-start gap-3 rounded-[var(--radius-card)] px-5 py-4",
          phase === "current" ? "bg-card shadow-[var(--shadow)]" : phase === "future" ? "border-[1.5px] border-dashed border-line" : "bg-card-muted",
        ].join(" ")}
      >
        <span className="min-w-0 flex-1">
          <span className={["block text-meta font-semibold", phase === "past" ? "text-text-3" : "text-text-2"].join(" ")}>
            {PHASE_LABEL[phase]} · {periodRange(period)}
          </span>
          {doses.length === 0 ? (
            <span className="mt-1 block text-body text-text-2">Bez dawek: lek nie pojawia się na liście.</span>
          ) : (
            <span className="mt-1 block">
              {doses.map((d) => (
                <span key={d.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-0.5">
                  <span className={["text-body", phase === "past" ? "text-text-2" : ""].join(" ")}>
                    {slotName(d.slotId)}
                    {d.exactTime && <span className="text-text-2"> · {d.exactTime}</span>}
                  </span>
                  <span className={["text-body font-semibold", phase === "past" ? "text-text-2" : ""].join(" ")}>
                    {doseTotal(med, d)}
                    {d.parts.length > 1 && <span className="font-normal text-text-2"> ({doseBreakdown(med, d)})</span>}
                  </span>
                </span>
              ))}
            </span>
          )}
        </span>
        <ChevronRight aria-hidden className="mt-0.5 size-5 shrink-0 text-text-3" />
        <span className="sr-only">Zmień</span>
      </Link>
    </li>
  );
}
