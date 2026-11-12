"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import Link from "next/link";
import { dayDiff, longDate, weekdayName } from "@/lib/dates";
import type { DateKey } from "@/lib/domain/types";

export function DayHeader({
  date,
  today,
  editing,
  canEdit,
  onShift,
  onToday,
  onCalendar,
  onToggleEdit,
}: {
  date: DateKey;
  today: DateKey;
  editing: boolean;
  canEdit: boolean;
  onShift: (days: -1 | 1) => void;
  onToday: () => void;
  onCalendar: () => void;
  onToggleEdit: () => void;
}) {
  const diff = dayDiff(date, today);
  const rel = diff === 0 ? "Dziś" : diff === -1 ? "Wczoraj" : diff === 1 ? "Jutro" : null;
  const weekday = weekdayName(date);

  return (
    <header className="px-5 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="-mx-2 flex h-11 items-center justify-between">
        {canEdit ? (
          <button
            type="button"
            onClick={onToggleEdit}
            className={[
              "h-11 rounded-full px-3 text-body",
              editing ? "bg-action font-semibold text-on-action" : "font-medium text-text",
            ].join(" ")}
          >
            {editing ? "Gotowe" : "Edytuj"}
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1">
          {diff !== 0 && !editing && (
            <button type="button" onClick={onToday} className="h-11 rounded-full px-3 text-body font-semibold text-text">
              Wróć do dziś
            </button>
          )}
          <Link
            href="/ustawienia"
            aria-label="Ustawienia"
            className="grid size-11 place-items-center rounded-full text-text-2"
          >
            <Settings aria-hidden className="size-6" />
          </Link>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-meta font-semibold text-text-2 first-letter:uppercase">
            {rel ? `${rel} · ${weekday}` : weekday}
          </p>
          <h1 className="mt-0.5 font-rounded text-title font-bold tracking-[-0.02em]">{longDate(date)}</h1>
        </div>
        <div className="flex shrink-0 gap-2 pb-0.5">
          <RoundButton label="Poprzedni dzień" onClick={() => onShift(-1)} disabled={editing}>
            <ChevronLeft aria-hidden className="size-6" />
          </RoundButton>
          <RoundButton label="Następny dzień" onClick={() => onShift(1)} disabled={editing}>
            <ChevronRight aria-hidden className="size-6" />
          </RoundButton>
          <RoundButton label="Kalendarz" onClick={onCalendar} disabled={editing}>
            <CalendarDays aria-hidden className="size-[1.35rem]" />
          </RoundButton>
        </div>
      </div>
    </header>
  );
}

function RoundButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-11 place-items-center rounded-full bg-card text-text transition-transform duration-150 active:scale-90 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
