"use client";

import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@/lib/dnd";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Check, CheckCheck, ChevronDown } from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { ChecklistItem, DayMode, SlotGroup } from "@/lib/domain/checklist";
import { DoseRow } from "./dose-row";

export interface SlotCardProps {
  group: SlotGroup;
  mode: DayMode;
  current: boolean;
  editing: boolean;
  now: string | null;
  onToggle: (item: ChecklistItem, next: boolean) => void;
  onTakeAll: (group: SlotGroup) => void;
  onOpen: (item: ChecklistItem) => void;
  onReorder: (orderedDoseIds: string[]) => void;
}

export function SlotCard({ group, mode, current, editing, now, onToggle, onTakeAll, onOpen, onReorder }: SlotCardProps) {
  const { slot, items, takenCount, done } = group;
  const bodyId = useId();

  // Gotowa pora zwija się do jednej linii, z krótkim opóźnieniem, żeby było widać ostatnie odhaczenie.
  const [userOpen, setUserOpen] = useState(false);
  const [hold, setHold] = useState(false);
  const [prevDone, setPrevDone] = useState(done);
  if (done !== prevDone) {
    // Dostosowanie stanu w trakcie renderu (wzorzec React): pora właśnie się zakończyła albo odznaczono lek.
    setPrevDone(done);
    setHold(done);
    if (!done) setUserOpen(false);
  }
  useEffect(() => {
    if (!hold) return;
    const t = window.setTimeout(() => setHold(false), 650);
    return () => window.clearTimeout(t);
  }, [hold]);

  const open = !done || userOpen || hold;
  const expanded = editing || open;
  const collapsible = done && !editing;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map((i) => i.dose.id);

  function handleDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    onReorder(arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= ids.length) return;
    onReorder(arrayMove(ids, index, target));
  }

  const pending = items.filter((i) => !i.taken);
  const prominent = current && !editing;

  return (
    <section
      aria-labelledby={`${bodyId}-title`}
      className={[
        "rounded-[var(--radius-card)] transition-[background-color,box-shadow] duration-300",
        prominent ? "bg-card shadow-[var(--shadow)]" : "bg-card-muted",
      ].join(" ")}
    >
      <header className="flex min-h-[3.5rem] items-center gap-3 px-5">
        {collapsible ? (
          <button
            type="button"
            onClick={() => {
              setHold(false);
              setUserOpen(!open);
            }}
            aria-expanded={open}
            aria-controls={bodyId}
            className="-mx-5 flex min-h-[3.5rem] flex-1 items-center gap-3 rounded-[var(--radius-card)] px-5 text-left"
          >
            <h2 id={`${bodyId}-title`} className="flex-1 font-rounded text-body font-semibold text-text-2">
              {slot.name}
            </h2>
            <span className="flex items-center gap-1.5 text-meta font-semibold text-ok">
              <Check aria-hidden strokeWidth={3} className="size-4" />
              <span className="sr-only">wzięte </span>
              {takenCount}/{items.length}
            </span>
            <ChevronDown
              aria-hidden
              className={["size-5 text-text-3 transition-transform duration-300", open ? "rotate-180" : ""].join(" ")}
            />
          </button>
        ) : (
          <>
            <h2
              id={`${bodyId}-title`}
              className={["flex-1 font-rounded font-bold", prominent ? "text-slot" : "text-body"].join(" ")}
            >
              {slot.name}
            </h2>
            {!editing && (
              <span className="text-meta font-semibold text-text-2">
                {takenCount} z {items.length}
              </span>
            )}
          </>
        )}
      </header>

      <div
        id={bodyId}
        className="grid transition-[grid-template-rows] duration-[420ms] ease-[var(--ease-out-expo)]"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
        inert={!expanded}
      >
        <div className="overflow-hidden">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <ul className="divide-y divide-line px-5">
                {items.map((item, index) => (
                  <DoseRow
                    key={item.dose.id}
                    item={item}
                    mode={mode}
                    editing={editing}
                    overdue={!!(now && item.dose.exactTime && item.dose.exactTime <= now)}
                    onToggle={(next) => onToggle(item, next)}
                    onOpen={() => onOpen(item)}
                    onMove={(dir) => move(index, dir)}
                    canMoveUp={index > 0}
                    canMoveDown={index < items.length - 1}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          {mode === "editable" && !editing && pending.length > 1 && (
            <div className="px-5 pt-1 pb-5">
              <button
                type="button"
                onClick={() => onTakeAll(group)}
                className={[
                  "flex w-full items-center justify-center gap-2 rounded-full font-semibold transition-[transform,background-color] duration-150 active:scale-[0.98]",
                  prominent
                    ? "h-[3.25rem] bg-action text-body text-on-action active:bg-action-press"
                    : "h-12 border-[1.5px] border-[color-mix(in_srgb,var(--text)_24%,transparent)] text-meta text-text",
                ].join(" ")}
              >
                <CheckCheck aria-hidden className="size-5" strokeWidth={2.5} />
                Odhacz całą porę
              </button>
            </div>
          )}
          {!(mode === "editable" && !editing && pending.length > 1) && <div className="h-2" />}
        </div>
      </div>
    </section>
  );
}
