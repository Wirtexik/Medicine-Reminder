import type { SupabaseClient } from "@supabase/supabase-js";
import type { TimeSlot } from "../domain/types";
import type { Database } from "./database.types";

/* Zapis Ustawień: pory dnia i domyślny próg zapasu. Bez RPC: każda operacja to jedno zapytanie. */

type Client = SupabaseClient<Database>;

async function check(call: PromiseLike<{ error: unknown }>): Promise<void> {
  const { error } = await call;
  if (error) throw error;
}

export interface SlotDraft {
  name: string;
  /** HH:mm albo "" (bez przypomnienia). */
  reminderTime: string;
  isActive: boolean;
}

/** Nowa pora (id = null) trafia na koniec listy. */
export function saveSlot(s: Client, id: string | null, draft: SlotDraft, slots: TimeSlot[]): Promise<void> {
  const fields = { name: draft.name, reminder_time: draft.reminderTime || null, is_active: draft.isActive };
  if (id) return check(s.from("time_slots").update(fields).eq("id", id));
  const sortOrder = Math.max(0, ...slots.map((x) => x.sortOrder)) + 1;
  return check(s.from("time_slots").insert({ ...fields, sort_order: sortOrder }));
}

/** Kolejność pór: jedno zapytanie (upsert po id zmienia tylko nazwę i sort_order). */
export function saveSlotOrder(s: Client, ordered: TimeSlot[]): Promise<void> {
  return check(
    s.from("time_slots").upsert(
      ordered.map((slot, i) => ({ id: slot.id, name: slot.name, sort_order: i + 1 })),
      { onConflict: "id" },
    ),
  );
}

/**
 * Domyślny próg zapasu. `notLowIds`: leki, które przy nowym progu nie są już poniżej niego;
 * ich alert `low_stock` może przyjść ponownie, gdy zapas znów spadnie.
 */
export async function saveDefaultThreshold(s: Client, days: number, notLowIds: string[]): Promise<void> {
  const { data, error } = await s.auth.getSession();
  if (error) throw error;
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Brak sesji");
  await check(s.from("profiles").update({ low_stock_days: days }).eq("id", userId));
  if (notLowIds.length > 0) {
    await check(
      s.from("medications").update({ low_stock_notified_at: null }).in("id", notLowIds).not("low_stock_notified_at", "is", null),
    );
  }
}
