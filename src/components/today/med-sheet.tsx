"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Sheet } from "@/components/ui/sheet";
import { shortDate } from "@/lib/dates";
import { activePeriod, type ChecklistItem } from "@/lib/domain/checklist";
import { formatNumber, doseBreakdown, doseTotal } from "@/lib/domain/format";
import { FORM_LABEL, packageName, packageSizeLabel } from "@/lib/domain/forms";
import { forecastMedication } from "@/lib/domain/forecast";
import type { AppData, DateKey, DosingPeriod, Medication } from "@/lib/domain/types";

export function MedSheet({
  item,
  data,
  date,
  today,
  onOpenChange,
}: {
  item: ChecklistItem | null;
  data: AppData;
  date: DateKey;
  today: DateKey;
  onOpenChange: (open: boolean) => void;
}) {
  const med = item ? data.medications.find((m) => m.id === item.med.id) ?? item.med : null;

  return (
    <Sheet open={!!item} onOpenChange={onOpenChange} title={med ? med.name : "Lek"}>
      {med && item && <MedDetails med={med} data={data} date={date} today={today} />}
    </Sheet>
  );
}

function MedDetails({ med, data, date, today }: { med: Medication; data: AppData; date: DateKey; today: DateKey }) {
  const period = activePeriod(med, date);
  const next = period?.validTo ? med.periods.find((p) => p.validFrom > period.validTo!) : undefined;
  const forecast = forecastMedication(data, med, today);
  const slotName = (id: string) => data.slots.find((s) => s.id === id)?.name ?? "";
  const slotOrder = (id: string) => data.slots.find((s) => s.id === id)?.sortOrder ?? 0;

  return (
    <div className="pb-2">
      <h2 className="font-rounded text-title font-bold tracking-[-0.02em]">{med.name}</h2>
      <p className="mt-3 max-w-[60ch] text-body text-text">
        <span className="text-text-2">{FORM_LABEL[med.form]}.</span>
        {med.description && ` ${med.description}`}
      </p>

      {period && (
        <section className="mt-6">
          <h3 className="text-body font-bold">Dawkowanie</h3>
          <PeriodBlock med={med} period={period} slotName={slotName} slotOrder={slotOrder} current />
          {next && <PeriodBlock med={med} period={next} slotName={slotName} slotOrder={slotOrder} />}
        </section>
      )}

      <section className="mt-6">
        <h3 className="text-body font-bold">Zapas</h3>
        <ul className="mt-2 divide-y divide-line rounded-[var(--radius-field)] bg-card-muted px-4">
          {forecast.packages.map(({ pkg, lastDay, daysLeft }) => (
            <li key={pkg.id} className="flex items-baseline justify-between gap-3 py-3">
              <span className="text-body">
                {packageName(pkg)}
                <span className="text-meta text-text-2"> · {packageSizeLabel(pkg)}</span>
              </span>
              <span className="text-right">
                <span className="block text-body font-semibold">
                  {formatNumber(pkg.stock)} {pkg.unitLabel}
                </span>
                <span className={["block text-meta", daysLeft !== null && daysLeft <= forecast.threshold ? "font-semibold text-warn" : "text-text-2"].join(" ")}>
                  {lastDay ? `starczy do ${shortDate(lastDay)}` : "wystarczy na długo"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Link
        href={`/leki/${med.id}`}
        className="mt-6 flex h-12 w-full items-center justify-center gap-1 rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--text)_24%,transparent)] text-meta font-semibold text-text"
      >
        Szczegóły i dawkowanie
        <ChevronRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}

function PeriodBlock({
  med,
  period,
  slotName,
  slotOrder,
  current,
}: {
  med: Medication;
  period: DosingPeriod;
  slotName: (id: string) => string;
  slotOrder: (id: string) => number;
  current?: boolean;
}) {
  const range = period.validTo
    ? `${shortDate(period.validFrom)} – ${shortDate(period.validTo)}`
    : `od ${shortDate(period.validFrom)}`;
  return (
    <div className={["mt-2 rounded-[var(--radius-field)] px-4 py-3", current ? "bg-card-muted" : "border-[1.5px] border-dashed border-line"].join(" ")}>
      <p className="text-meta font-semibold text-text-2">
        {current ? "Teraz" : "Potem"} · {range}
      </p>
      <ul className="mt-1">
        {[...period.doses]
          .sort((a, b) => slotOrder(a.slotId) - slotOrder(b.slotId))
          .map((d) => (
            <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-x-3 py-1">
              <span className="text-body">
                {slotName(d.slotId)}
                {d.exactTime && <span className="text-text-2"> · {d.exactTime}</span>}
              </span>
              <span className="text-body font-semibold">
                {doseTotal(med, d)}
                {d.parts.length > 1 && <span className="font-normal text-text-2"> ({doseBreakdown(med, d)})</span>}
              </span>
            </li>
          ))}
      </ul>
    </div>
  );
}
