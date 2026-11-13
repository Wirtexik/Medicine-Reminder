"use client";

import { CalendarX2, CloudOff, Eye } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { SaveError, useStore } from "@/lib/data/store";
import { monthOf, nowTime, shiftDay, shiftMonth } from "@/lib/dates";
import { buildChecklist, dayMode, type ChecklistItem, type SlotGroup } from "@/lib/domain/checklist";
import { lowStock } from "@/lib/domain/forecast";
import type { DateKey } from "@/lib/domain/types";
import { CalendarSheet } from "./calendar-sheet";
import { DayHeader } from "./day-header";
import { MedSheet } from "./med-sheet";
import { SlotCard } from "./slot-card";
import { StockAlert } from "./stock-alert";
import { primaryPill } from "@/components/ui/buttons";

const SAVE_FAILED = "Nie udało się zapisać. Sprawdź połączenie i spróbuj ponownie.";

export function TodayScreen() {
  const { data, today, loadError, reload, ensureMonths, setTaken, takeSlot, reorder } = useStore();
  const toast = useToast();
  const [picked, setPicked] = useState<DateKey | null>(null);
  const [editing, setEditing] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [sheetItem, setSheetItem] = useState<ChecklistItem | null>(null);

  const date = picked ?? today;
  const ready = !!data && !!today;
  const groups = useMemo(() => (data && date ? buildChecklist(data, date) : []), [data, date]);
  const low = useMemo(() => (data && today && date === today ? lowStock(data, today) : []), [data, date, today]);

  // Odhaczenia wybranego dnia i sąsiednich miesięcy (kalendarz otwiera się na miesiącu wybranego dnia).
  useEffect(() => {
    if (!date) return;
    const month = monthOf(date);
    ensureMonths([month, shiftMonth(month, -1), shiftMonth(month, 1)]);
  }, [date, ensureMonths]);

  if (!ready) return loadError ? <LoadError onRetry={reload} /> : <TodaySkeleton />;

  const mode = dayMode(date, today);
  const currentSlotId = date === today ? groups.find((g) => !g.done)?.slot.id : undefined;
  const now = date === today ? nowTime() : null;

  async function guard(op: Promise<void>) {
    try {
      await op;
    } catch (e) {
      toast.show(e instanceof SaveError ? SAVE_FAILED : "Coś poszło nie tak. Spróbuj ponownie.");
    }
  }

  const toggle = (item: ChecklistItem, next: boolean) => guard(setTaken(item.dose.id, date, next));
  const takeAll = (group: SlotGroup) =>
    guard(takeSlot(group.items.filter((i) => !i.taken).map((i) => i.dose.id), date));

  return (
    <>
      <DayHeader
        date={date}
        today={today}
        editing={editing}
        canEdit={groups.length > 0 && dayMode(date, today) === "editable"}
        onShift={(d) => setPicked(shiftDay(date, d))}
        onToday={() => setPicked(null)}
        onCalendar={() => setCalendarOpen(true)}
        onToggleEdit={() => setEditing((e) => !e)}
      />

      <main className="flex flex-col gap-3 px-4 pt-5 pb-8">
        {editing && (
          <p className="px-1 text-meta text-text-2">
            Przeciągnij lek za uchwyt albo użyj strzałek, żeby ustawić kolejność w porze.
          </p>
        )}
        {!editing && <DayNote mode={mode} date={date} today={today} />}
        {!editing && <StockAlert low={low} />}

        {groups.length === 0 && <EmptyDay />}

        {groups.map((group) => (
          <SlotCard
            key={`${date}-${group.slot.id}`}
            group={group}
            mode={mode}
            current={group.slot.id === currentSlotId}
            editing={editing}
            now={now}
            onToggle={toggle}
            onTakeAll={takeAll}
            onOpen={setSheetItem}
            onReorder={(ids) => guard(reorder(ids))}
          />
        ))}
      </main>

      <MedSheet
        item={sheetItem}
        data={data}
        date={date}
        today={today}
        onOpenChange={(o) => !o && setSheetItem(null)}
      />
      <CalendarSheet
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        data={data}
        selected={date}
        today={today}
        onPick={(d) => {
          setPicked(d === today ? null : d);
          setCalendarOpen(false);
        }}
      />
    </>
  );
}

function DayNote({ mode, date, today }: { mode: ReturnType<typeof dayMode>; date: DateKey; today: DateKey }) {
  if (mode === "editable" && date === today) return null;
  const text =
    mode === "editable"
      ? "Wczorajsze dawki możesz jeszcze poprawić."
      : mode === "future"
        ? "Plan na ten dzień. Odhaczyć można dopiero w dniu przyjęcia."
        : "Tylko podgląd. Tego dnia nie można już zmieniać.";
  return (
    <p className="flex items-center gap-2 px-1 text-meta text-text-2">
      {mode !== "editable" && <Eye aria-hidden className="size-4 shrink-0" />}
      {text}
    </p>
  );
}

function EmptyDay() {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius-card)] bg-card-muted px-6 py-10 text-center">
      <CalendarX2 aria-hidden className="size-8 text-text-3" />
      <p className="mt-3 text-body font-semibold">Brak leków na ten dzień</p>
      <p className="mt-1 max-w-[30ch] text-meta text-text-2">
        Leki pojawią się tutaj, gdy w zakładce Leki dodasz okres dawkowania obejmujący ten dzień.
      </p>
    </div>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="px-4 pt-[max(3.5rem,calc(env(safe-area-inset-top)+3rem))]">
      <div role="alert" className="flex flex-col items-center rounded-[var(--radius-card)] bg-card-muted px-6 py-10 text-center">
        <CloudOff aria-hidden className="size-8 text-text-3" />
        <p className="mt-3 text-body font-semibold">Nie udało się wczytać leków</p>
        <p className="mt-1 max-w-[30ch] text-meta text-text-2">Sprawdź połączenie z internetem i spróbuj ponownie.</p>
        <button
          type="button"
          onClick={onRetry}
          className={`mt-5 ${primaryPill}`}
        >
          Spróbuj ponownie
        </button>
      </div>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div aria-busy="true" aria-label="Wczytywanie" className="px-4 pt-[max(3.5rem,calc(env(safe-area-inset-top)+3rem))]">
      <div className="h-4 w-28 rounded-full bg-card-muted" />
      <div className="mt-2 h-8 w-48 rounded-full bg-card-muted" />
      <div className="mt-7 h-14 rounded-[var(--radius-card)] bg-card-muted" />
      <div className="mt-3 h-64 rounded-[var(--radius-card)] bg-card-muted" />
    </div>
  );
}
