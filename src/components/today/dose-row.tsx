"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, ChevronDown, ChevronUp, Clock, GripVertical } from "lucide-react";
import { DoseCheck } from "@/components/ui/dose-check";
import type { DayMode, ChecklistItem } from "@/lib/domain/checklist";
import { doseBreakdown, doseTotal } from "@/lib/domain/format";

export interface DoseRowProps {
  item: ChecklistItem;
  mode: DayMode;
  editing: boolean;
  overdue: boolean;
  onToggle: (next: boolean) => void;
  onOpen: () => void;
  onMove?: (dir: -1 | 1) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export function DoseRow({ item, mode, editing, overdue, onToggle, onOpen, onMove, canMoveUp, canMoveDown }: DoseRowProps) {
  const { med, dose, taken } = item;
  const total = doseTotal(med, dose);
  const breakdown = doseBreakdown(med, dose);
  const title = `${med.name} ${total}`.trim();

  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: dose.id,
    disabled: !editing,
  });
  const style = editing ? { transform: CSS.Transform.toString(transform), transition } : undefined;

  const missed = mode === "readonly-past" && !taken;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[
        "relative flex min-h-[4.25rem] items-center gap-3 py-2.5",
        isDragging ? "z-10 rounded-[var(--radius-field)] bg-card shadow-[var(--shadow)]" : "",
      ].join(" ")}
    >
      {!editing && mode === "editable" && <DoseCheck checked={taken} onChange={onToggle} label={title} />}
      {!editing && mode !== "editable" && <StaticMark taken={taken} future={mode === "future"} />}

      <button
        type="button"
        onClick={onOpen}
        disabled={editing}
        className="min-w-0 flex-1 rounded-lg text-left disabled:cursor-default"
      >
        <span
          className={[
            "block font-rounded text-med font-semibold tracking-[-0.01em] transition-colors duration-300",
            taken || missed ? "text-text-2" : "text-text",
          ].join(" ")}
        >
          {med.name} <span className="whitespace-nowrap">{total}</span>
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-text-2">
          {dose.exactTime && (
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                overdue && !taken ? "bg-warn-soft text-warn" : "bg-ground text-text",
              ].join(" ")}
            >
              <Clock aria-hidden className="size-3.5" strokeWidth={2.5} />
              <span className="sr-only">o godzinie </span>
              {dose.exactTime}
            </span>
          )}
          {breakdown}
          {missed && <span className="font-semibold text-miss"> · pominięta</span>}
        </span>
      </button>

      {editing && (
        <div className="flex shrink-0 items-center">
          {/* Alternatywa dla przeciągania (WCAG 2.5.7): strzałki jedna nad drugą, każda 44pt. */}
          <div className={["flex flex-col", !canMoveUp && !canMoveDown ? "hidden" : ""].join(" ")}>
            <button
              type="button"
              onClick={() => onMove?.(-1)}
              disabled={!canMoveUp}
              aria-label={`Przesuń wyżej: ${title}`}
              className="grid size-11 place-items-center rounded-full text-text disabled:text-text-3 disabled:opacity-40"
            >
              <ChevronUp aria-hidden className="size-6" />
            </button>
            <button
              type="button"
              onClick={() => onMove?.(1)}
              disabled={!canMoveDown}
              aria-label={`Przesuń niżej: ${title}`}
              className="grid size-11 place-items-center rounded-full text-text disabled:text-text-3 disabled:opacity-40"
            >
              <ChevronDown aria-hidden className="size-6" />
            </button>
          </div>
          <span
            {...attributes}
            {...listeners}
            aria-label={`Przeciągnij: ${title}`}
            className="grid size-11 touch-none cursor-grab place-items-center rounded-full text-text active:cursor-grabbing"
          >
            <GripVertical aria-hidden className="size-6" />
          </span>
        </div>
      )}
    </li>
  );
}

function StaticMark({ taken, future }: { taken: boolean; future: boolean }) {
  if (taken) {
    return (
      <span role="img" className="-m-2 grid size-12 shrink-0 place-items-center" aria-label="wzięta">
        <span className="grid size-[1.9rem] place-items-center rounded-full bg-text-3">
          <Check aria-hidden strokeWidth={3.25} className="size-[1.15rem] text-card" />
        </span>
      </span>
    );
  }
  return (
    <span role="img" className="-m-2 grid size-12 shrink-0 place-items-center" aria-label={future ? "zaplanowana" : "pominięta"}>
      <span
        className={[
          "size-[1.9rem] rounded-full border-[2.5px] border-dashed",
          future ? "border-text-3" : "border-miss",
        ].join(" ")}
      />
    </span>
  );
}
