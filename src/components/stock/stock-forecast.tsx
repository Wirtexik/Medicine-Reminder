import { shortDate } from "@/lib/dates";
import { pluralDni } from "@/lib/domain/format";
import type { PackageForecast } from "@/lib/domain/forecast";

/** Tekst prognozy opakowania: „12 dni · do 24.11”, „zapas się skończył”, „nie w dawkowaniu”. */
export function forecastText(f: PackageForecast): string {
  if (!f.used) return "nie w dawkowaniu";
  if (f.daysLeft === null || f.lastDay === null) return "starczy na ponad rok";
  if (f.daysLeft === 0) return "zapas się skończył";
  return `${f.daysLeft} ${pluralDni(f.daysLeft)} · do ${shortDate(f.lastDay)}`;
}

export function isLowPackage(f: PackageForecast, threshold: number): boolean {
  return f.daysLeft !== null && f.daysLeft <= threshold;
}

export function StockForecastLine({ forecast, threshold }: { forecast: PackageForecast; threshold: number }) {
  const low = isLowPackage(forecast, threshold);
  return (
    <p className={["text-meta", low ? "font-semibold text-warn" : "text-text-2"].join(" ")}>
      {low && <span className="sr-only">Kończy się, </span>}
      {forecastText(forecast)}
    </p>
  );
}
