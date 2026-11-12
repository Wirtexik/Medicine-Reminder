"use client";

import { useState } from "react";
import { FormError, outlineButton } from "@/components/ui/controls";
import { TextField } from "@/components/ui/text-field";
import { saveDefaultThreshold } from "@/lib/data/settings";
import { useStore } from "@/lib/data/store";
import { useSave } from "@/lib/data/use-save";
import { pluralLeki } from "@/lib/domain/format";
import { forecastMedication } from "@/lib/domain/forecast";
import { parseNumber } from "@/lib/domain/forms";
import type { AppData, DateKey } from "@/lib/domain/types";
import { settingsCard } from "./slots-section";

/** Domyślny próg zapasu (dni). Lek z własnym progiem go nie używa. */
export function ThresholdSection() {
  const { data, today } = useStore();
  if (!data || !today) return <div aria-hidden className="mt-4 h-52 rounded-[var(--radius-card)] bg-card-muted" />;
  return <ThresholdForm key={data.defaultLowStockDays} data={data} today={today} />;
}

function ThresholdForm({ data, today }: { data: AppData; today: DateKey }) {
  const { run, pending, error } = useSave();
  const [value, setValue] = useState(String(data.defaultLowStockDays));
  const [localError, setLocalError] = useState<string | null>(null);
  const days = parseNumber(value);
  const changed = days !== data.defaultLowStockDays;
  const ownThreshold = data.medications.filter((m) => !m.isArchived && m.lowStockDays !== null).length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isInteger(days) || days < 1 || days > 365) return setLocalError("Podaj liczbę dni od 1 do 365, np. 7.");
    setLocalError(null);
    const next = { ...data, defaultLowStockDays: days };
    const notLow = data.medications.filter((m) => !forecastMedication(next, m, today).isLow).map((m) => m.id);
    await run((s) => saveDefaultThreshold(s, days, notLow));
  }

  return (
    <section aria-labelledby="sec-threshold" className={`mt-4 px-5 py-5 ${settingsCard}`}>
      <h2 id="sec-threshold" className="text-body font-bold">
        Próg zapasu
      </h2>
      <p className="mt-1 text-meta text-text-2">
        Lek trafia do „Kończą się”, gdy zapas wystarczy na tyle dni lub mniej.
        {ownThreshold > 0 && ` ${ownThreshold} ${pluralLeki(ownThreshold)} ${pluralLeki(ownThreshold) === "leki" ? "mają" : "ma"} własny próg, ustawiony w szczegółach leku.`}
      </p>
      <form onSubmit={submit} noValidate className="mt-4 space-y-3">
        <TextField
          label="Domyślny próg"
          inputMode="numeric"
          autoComplete="off"
          suffix="dni"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <FormError message={localError ?? error} />
        <button type="submit" disabled={pending || !changed} className={outlineButton}>
          {pending ? "Zapisywanie…" : "Zapisz próg"}
        </button>
      </form>
    </section>
  );
}
