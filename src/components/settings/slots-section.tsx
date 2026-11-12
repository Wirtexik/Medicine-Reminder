"use client";

import { ChevronDown, ChevronRight, ChevronUp, Plus, X } from "lucide-react";
import { useState } from "react";
import { CheckRow, FormError, outlineButton, primaryButton, roundButton } from "@/components/ui/controls";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { saveSlot, saveSlotOrder } from "@/lib/data/settings";
import { useStore } from "@/lib/data/store";
import { useSave } from "@/lib/data/use-save";
import { pluralLeki } from "@/lib/domain/format";
import type { AppData, DateKey, TimeSlot } from "@/lib/domain/types";

export const settingsCard = "rounded-[var(--radius-card)] bg-card shadow-[var(--shadow)]";

/** Pory dnia: nazwa, godzina przypomnienia, włączenie, kolejność; dodanie nowej pory. */
export function SlotsSection() {
  const { data, today } = useStore();
  const { run, pending, error, setError } = useSave();
  const [editing, setEditing] = useState<{ slot: TimeSlot | null } | null>(null);
  const [order, setOrder] = useState<TimeSlot[] | null>(null);

  if (!data || !today) return <div aria-hidden className="mt-6 h-96 rounded-[var(--radius-card)] bg-card-muted" />;

  const sorted = [...data.slots].sort((a, b) => a.sortOrder - b.sortOrder);
  const list = order ?? sorted;
  const reordering = order !== null;

  function move(i: number, by: -1 | 1) {
    if (!order) return;
    const next = [...order];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    setOrder(next);
  }

  async function saveOrder() {
    if (!order) return;
    if (order.every((s, i) => s.id === sorted[i]?.id)) return setOrder(null);
    const r = await run((s) => saveSlotOrder(s, order));
    if (r.ok) setOrder(null);
  }

  return (
    <section aria-labelledby="sec-slots" className={`mt-6 ${settingsCard}`}>
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <h2 id="sec-slots" className="text-body font-bold">
          Pory dnia
        </h2>
        {!reordering && sorted.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setOrder(sorted);
            }}
            className="-mr-2 h-11 rounded-full px-2 text-meta font-semibold text-action-ink"
          >
            Zmień kolejność
          </button>
        )}
      </div>
      <p className="mt-0.5 px-5 text-meta text-text-2">
        {reordering ? "Ustaw pory w kolejności, w jakiej mijają w ciągu dnia." : "W tej kolejności pory są na liście „Dziś”."}
      </p>

      <ul className="mt-2 divide-y divide-line">
        {list.map((slot, i) => (
          <li key={slot.id}>
            {reordering ? (
              <div className="flex min-h-[3.75rem] items-center gap-2 py-2 pr-3 pl-5">
                <SlotLabel slot={slot} />
                <button type="button" aria-label={`Przesuń wyżej: ${slot.name}`} disabled={i === 0} onClick={() => move(i, -1)} className={roundButton}>
                  <ChevronUp aria-hidden className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label={`Przesuń niżej: ${slot.name}`}
                  disabled={i === list.length - 1}
                  onClick={() => move(i, 1)}
                  className={roundButton}
                >
                  <ChevronDown aria-hidden className="size-5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditing({ slot })}
                className="flex min-h-[3.75rem] w-full items-center gap-3 px-5 py-2 text-left active:bg-card-muted"
              >
                <SlotLabel slot={slot} />
                <ChevronRight aria-hidden className="size-5 shrink-0 text-text-3" />
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="border-t border-line px-5 pt-3 pb-5">
        {reordering ? (
          <div className="space-y-2">
            <FormError message={error} />
            <button type="button" disabled={pending} onClick={saveOrder} className={primaryButton}>
              {pending ? "Zapisywanie…" : "Gotowe"}
            </button>
            <button type="button" disabled={pending} onClick={() => setOrder(null)} className={outlineButton}>
              Anuluj
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditing({ slot: null })} className={outlineButton}>
            <Plus aria-hidden className="size-4" />
            Dodaj porę
          </button>
        )}
      </div>

      <Sheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} title={editing?.slot ? "Pora dnia" : "Nowa pora dnia"}>
        {editing && <SlotForm slot={editing.slot} data={data} today={today} onDone={() => setEditing(null)} />}
      </Sheet>
    </section>
  );
}

function SlotLabel({ slot }: { slot: TimeSlot }) {
  return (
    <span className="min-w-0 flex-1">
      <span className={["block text-body font-semibold", slot.isActive ? "" : "text-text-2"].join(" ")}>{slot.name}</span>
      <span className="block text-meta text-text-2">
        {!slot.isActive ? "wyłączona" : slot.reminderTime ? `przypomnienie o ${slot.reminderTime}` : "bez przypomnienia"}
      </span>
    </span>
  );
}

/** Leki, które mają dawkę w tej porze w bieżącym albo przyszłym okresie. */
function medsInSlot(data: AppData, slotId: string, today: DateKey): number {
  return data.medications.filter(
    (m) =>
      !m.isArchived &&
      m.periods.some((p) => (p.validTo === null || p.validTo >= today) && p.doses.some((d) => d.slotId === slotId)),
  ).length;
}

function SlotForm({ slot, data, today, onDone }: { slot: TimeSlot | null; data: AppData; today: DateKey; onDone: () => void }) {
  const { run, pending, error } = useSave();
  const [name, setName] = useState(slot?.name ?? "");
  const [time, setTime] = useState(slot?.reminderTime ?? "");
  const [active, setActive] = useState(slot?.isActive ?? true);
  const [localError, setLocalError] = useState<string | null>(null);
  const inUse = slot ? medsInSlot(data, slot.id, today) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setLocalError("Podaj nazwę pory, np. W południe.");
    const duplicate = data.slots.some((s) => s.id !== slot?.id && s.name.trim().toLowerCase() === trimmed.toLowerCase());
    if (duplicate) return setLocalError("Pora o tej nazwie już jest.");
    if (time && !/^\d{2}:\d{2}$/.test(time)) return setLocalError("Podaj godzinę albo ją usuń.");
    setLocalError(null);
    const r = await run((s) => saveSlot(s, slot?.id ?? null, { name: trimmed, reminderTime: time, isActive: active }, data.slots));
    if (r.ok) onDone();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 pb-2">
      <h2 className="font-rounded text-slot font-bold">{slot ? slot.name : "Nowa pora dnia"}</h2>
      <TextField label="Nazwa" autoComplete="off" placeholder="np. W południe" value={name} onChange={(e) => setName(e.target.value)} />

      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <TextField
            label="Przypomnienie o nieodhaczonych"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        {time && (
          <button type="button" onClick={() => setTime("")} aria-label="Bez przypomnienia" className={`${roundButton} mb-1`}>
            <X aria-hidden className="size-5" />
          </button>
        )}
      </div>
      <p className="-mt-2 px-1 text-meta text-text-2">
        {time
          ? `Jeśli o ${time} w tej porze zostaną nieodhaczone leki, przyjdzie powiadomienie.`
          : "Bez przypomnienia: z tej pory nie przyjdzie powiadomienie."}
      </p>

      {slot && (
        <div>
          <CheckRow label="Pora włączona" checked={active} onChange={setActive} />
          {!active && (
            <p className="px-1 text-meta text-text-2">
              Wyłączonej pory nie wybierzesz przy nowych dawkach i nie przyjdą z niej przypomnienia.
              {inUse > 0 &&
                ` Ma ją ${inUse} ${pluralLeki(inUse)} w dawkowaniu: ${inUse === 1 ? "zostanie" : "zostaną"} na liście „Dziś”, dopóki nie zmienisz dawek.`}
            </p>
          )}
        </div>
      )}

      <FormError message={localError ?? error} />
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Zapisywanie…" : slot ? "Zapisz" : "Dodaj porę"}
      </button>
    </form>
  );
}
