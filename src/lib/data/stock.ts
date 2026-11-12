import type { SupabaseClient } from "@supabase/supabase-js";
import type { MedPackage } from "../domain/types";
import type { Database } from "./database.types";
import { savePackage } from "./meds";

/*
  Zapis na ekranie „Zapasy”. Stan opakowania to suma ruchów w stock_movements
  (trigger przelicza med_packages.stock_cached), więc tu dopisujemy tylko ruchy.
*/

type Client = SupabaseClient<Database>;

async function check(call: PromiseLike<{ error: unknown }>): Promise<void> {
  const { error } = await call;
  if (error) throw error;
}

/** „+ opakowanie”: ruch `purchase` o rozmiar opakowania (razy `count`). */
export function addPackages(s: Client, pkg: MedPackage, count = 1): Promise<void> {
  return check(s.from("stock_movements").insert({ package_id: pkg.id, delta: pkg.packageSize * count, reason: "purchase" }));
}

/** „Korekta stanu”: ustawia stan na `stock` ruchem `correction` (różnicę liczy baza). */
export async function correctStock(s: Client, medicationId: string, pkg: MedPackage, stock: number): Promise<void> {
  await savePackage(s, medicationId, pkg.id, {
    strengthValue: pkg.strengthValue,
    strengthUnit: pkg.strengthUnit,
    unitLabel: pkg.unitLabel,
    packageSize: pkg.packageSize,
    stock,
  });
}

/**
 * Zapas wrócił powyżej progu: alert `low_stock` (powiadomienia, krok 8) może zostać
 * wysłany ponownie, gdy zapas znów spadnie.
 */
export function clearLowStockAlert(s: Client, medicationId: string): Promise<void> {
  return check(
    s.from("medications").update({ low_stock_notified_at: null }).eq("id", medicationId).not("low_stock_notified_at", "is", null),
  );
}
