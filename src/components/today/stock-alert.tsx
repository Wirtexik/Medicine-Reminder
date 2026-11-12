"use client";

import { ChevronRight, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { shortDate } from "@/lib/dates";
import { packageLabel, pluralLeki } from "@/lib/domain/format";
import type { MedForecast } from "@/lib/domain/forecast";

export function StockAlert({ low }: { low: MedForecast[] }) {
  if (low.length === 0) return null;
  const first = low[0];
  const multiStrength = first.med.packages.length > 1;
  const name = multiStrength && first.weakest ? `${first.med.name} ${packageLabel(first.weakest.pkg)}` : first.med.name;

  const title = low.length === 1 ? `${name} się kończy` : `${low.length} ${pluralLeki(low.length)} się kończy`;
  const meta =
    low.length === 1
      ? first.weakest?.daysLeft === 0
        ? "zapas się skończył"
        : `starczy do ${shortDate(first.weakest!.lastDay!)}`
      : low.map((f) => f.med.name).join(", ");

  return (
    <Link
      href="/zapasy"
      className="flex min-h-[3.75rem] items-center gap-3 rounded-[var(--radius-card)] bg-warn-soft px-4 py-3"
    >
      <TriangleAlert aria-hidden className="size-6 shrink-0 text-warn" strokeWidth={2.25} />
      <span className="min-w-0 flex-1">
        <span className="block text-body font-semibold text-text">{title}</span>
        <span className="block truncate text-meta text-text-2">{meta}</span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-text-2" />
    </Link>
  );
}
