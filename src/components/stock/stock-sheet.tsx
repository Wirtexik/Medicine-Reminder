"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { FormError, outlineButton, primaryButton } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { addPackages, clearLowStockAlert, correctStock } from "@/lib/data/stock";
import { useSave } from "@/lib/data/use-save";
import { formatNumber } from "@/lib/domain/format";
import { forecastMedication } from "@/lib/domain/forecast";
import { packageName, parseNumber } from "@/lib/domain/forms";
import type { AppData, DateKey, Medication, MedPackage } from "@/lib/domain/types";
import { StockForecastLine } from "./stock-forecast";

export interface StockTarget {
  medId: string;
  pkgId: string;
}

/** Arkusz opakowania: „+ opakowanie” albo korekta stanu. */
export function StockSheet({
  target,
  data,
  today,
  onClose,
}: {
  target: StockTarget | null;
  data: AppData;
  today: DateKey;
  onClose: () => void;
}) {
  const med = target ? data.medications.find((m) => m.id === target.medId) : undefined;
  const pkg = med?.packages.find((p) => p.id === target?.pkgId);
  const open = Boolean(med && pkg);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()} title="Zapas opakowania">
      {med && pkg && <StockForm key={pkg.id} med={med} pkg={pkg} data={data} today={today} onDone={onClose} />}
    </Sheet>
  );
}

function StockForm({
  med,
  pkg,
  data,
  today,
  onDone,
}: {
  med: Medication;
  pkg: MedPackage;
  data: AppData;
  today: DateKey;
  onDone: () => void;
}) {
  const { run, pending, error } = useSave();
  const [stock, setStock] = useState("");
  const [stockError, setStockError] = useState<string | null>(null);
  const forecast = forecastMedication(data, med, today).packages.find((p) => p.pkg.id === pkg.id)!;
  const multi = med.packages.length > 1;
  const bottle = pkg.unitLabel === "krople" || pkg.unitLabel === "ml";

  /** Po zmianie stanu: jeśli lek nie jest już poniżej progu, alert może przyjść ponownie. */
  function backAboveThreshold(newStock: number): boolean {
    const changed: Medication = { ...med, packages: med.packages.map((p) => (p.id === pkg.id ? { ...p, stock: newStock } : p)) };
    return !forecastMedication(data, changed, today).isLow;
  }

  async function purchase() {
    const reset = backAboveThreshold(pkg.stock + pkg.packageSize);
    const r = await run(async (s) => {
      await addPackages(s, pkg);
      if (reset) await clearLowStockAlert(s, med.id);
    });
    if (r.ok) onDone();
  }

  async function correct(e: React.FormEvent) {
    e.preventDefault();
    const value = parseNumber(stock);
    if (!(value >= 0)) return setStockError("Podaj, ile masz teraz (może być 0).");
    setStockError(null);
    if (Math.abs(value - pkg.stock) < 0.001) return onDone();
    const reset = backAboveThreshold(value);
    const r = await run(async (s) => {
      await correctStock(s, med.id, pkg, value);
      if (reset) await clearLowStockAlert(s, med.id);
    });
    if (r.ok) onDone();
  }

  return (
    <div className="pb-2">
      <h2 className="font-rounded text-slot font-bold">
        {med.name}
        {multi && <span className="font-semibold text-text-2"> · {packageName(pkg)}</span>}
      </h2>

      <div className="mt-3 rounded-[var(--radius-field)] bg-card-muted px-4 py-3">
        <p className="text-meta text-text-2">Masz teraz</p>
        <p className="font-rounded text-title font-bold tracking-[-0.02em]">
          {formatNumber(pkg.stock)} <span className="text-slot font-semibold text-text-2">{pkg.unitLabel}</span>
        </p>
        <StockForecastLine forecast={forecast} threshold={med.lowStockDays ?? data.defaultLowStockDays} />
      </div>

      <button type="button" disabled={pending} onClick={purchase} className={`${primaryButton} mt-4`}>
        <Plus aria-hidden className="size-5" />
        {bottle ? "Butelka" : "Opakowanie"} ({formatNumber(pkg.packageSize)} {pkg.unitLabel})
      </button>

      <form onSubmit={correct} noValidate className="mt-6 space-y-3 border-t border-line pt-5">
        <TextField
          label="Korekta stanu"
          inputMode="decimal"
          autoComplete="off"
          placeholder={formatNumber(pkg.stock).replace(/\s/g, "")}
          suffix={pkg.unitLabel}
          hint="Wpisz, ile faktycznie masz, np. po przeliczeniu tabletek."
          error={stockError}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
        <button type="submit" disabled={pending || !stock.trim()} className={outlineButton}>
          Zapisz stan
        </button>
      </form>
      <FormError message={pending ? null : error} />
    </div>
  );
}
