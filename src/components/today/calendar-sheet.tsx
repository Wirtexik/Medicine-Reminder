"use client";

import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { pl } from "date-fns/locale";
import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { monthTitle } from "@/lib/dates";
import { dayStatus, type DayStatus } from "@/lib/domain/checklist";
import type { AppData, DateKey } from "@/lib/domain/types";

const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

/* Status ma kształt, nie tylko kolor (WCAG 1.4.1): pełna kropka, pół kropki, pusty pierścień. */
function StatusMark({ status, size = "sm" }: { status: DayStatus; size?: "sm" | "lg" }) {
  if (status === "empty") return null;
  const dim = size === "sm" ? "size-[0.45rem]" : "size-[0.7rem]";
  if (status === "all") return <span aria-hidden className={`${dim} rounded-full bg-ok`} />;
  if (status === "some")
    return (
      <span
        aria-hidden
        className={`${dim} rounded-full border-[1.5px] border-part`}
        style={{ background: "linear-gradient(90deg, var(--part) 50%, transparent 50%)" }}
      />
    );
  return <span aria-hidden className={`${dim} rounded-full border-[1.5px] border-miss`} />;
}
const STATUS_LABEL: Record<DayStatus, string> = {
  all: "wszystko wzięte",
  some: "część wzięta",
  none: "nic nie wzięte",
  empty: "brak leków",
};

export function CalendarSheet({
  open,
  onOpenChange,
  data,
  selected,
  today,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AppData;
  selected: DateKey;
  today: DateKey;
  onPick: (date: DateKey) => void;
}) {
  const [month, setMonth] = useState(() => startOfMonth(parseISO(selected)));
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setMonth(startOfMonth(parseISO(selected)));
  }

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }),
    [month],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Kalendarz">
      <div className="flex items-center justify-between">
        <h2 className="font-rounded text-slot font-bold first-letter:uppercase">{monthTitle(format(month, "yyyy-MM-dd"))}</h2>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Poprzedni miesiąc"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            className="grid size-11 place-items-center rounded-full bg-card-muted"
          >
            <ChevronLeft aria-hidden className="size-6" />
          </button>
          <button
            type="button"
            aria-label="Następny miesiąc"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="grid size-11 place-items-center rounded-full bg-card-muted"
          >
            <ChevronRight aria-hidden className="size-6" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 text-center text-caption font-semibold text-text-2" aria-hidden>
        {WEEKDAYS.map((d) => (
          <span key={d} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <ul className="grid grid-cols-7 gap-y-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const inMonth = isSameMonth(day, month);
          const past = key <= today;
          const status: DayStatus = past ? dayStatus(data, key) : "empty";
          const isToday = key === today;
          const isSelected = key === selected;
          if (!inMonth) {
            // Dni z sąsiednich miesięcy tylko wypełniają siatkę; nie są przyciskami.
            return (
              <li key={key} aria-hidden className="grid size-11 place-items-center justify-self-center text-body text-text-3">
                {format(day, "d")}
              </li>
            );
          }
          return (
            <li key={key} className="grid place-items-center">
              <button
                type="button"
                onClick={() => onPick(key)}
                aria-label={`${format(day, "d MMMM", { locale: pl })}${past && status !== "empty" ? `, ${STATUS_LABEL[status]}` : ""}`}
                aria-current={isSelected ? "date" : undefined}
                className={[
                  "relative grid size-11 place-items-center rounded-full text-body",
                  isSelected ? "bg-text font-bold text-ground" : isToday ? "font-bold ring-2 ring-text ring-inset" : "",
                ].join(" ")}
              >
                {format(day, "d")}
                {status !== "empty" && key !== today && (
                  <span className="absolute bottom-1 flex">
                    <StatusMark status={status} />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-meta text-text-2">
        {(["all", "some", "none"] as const).map((s) => (
          <li key={s} className="flex items-center gap-2">
            <StatusMark status={s} size="lg" />
            {STATUS_LABEL[s]}
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
