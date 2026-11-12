import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "../data/database.types";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/** Klient Supabase w przeglądarce (sesja w ciasteczkach, wspólna z serwerem). */
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_KEY);
}
