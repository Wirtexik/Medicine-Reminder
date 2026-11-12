import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "../data/database.types";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/** Klient Supabase dla Server Components i Server Functions. Nowy na każde żądanie. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Wywołane z Server Component, gdzie nie można zapisać ciasteczek.
          // Sesję odświeża Proxy (src/proxy.ts), więc można to pominąć.
        }
      },
    },
  });
}
