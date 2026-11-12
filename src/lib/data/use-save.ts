"use client";

import { useCallback, useMemo, useState } from "react";
import { createClient } from "../supabase/client";
import { saveErrorMessage } from "./meds";
import { useStore } from "./store";

type Client = ReturnType<typeof createClient>;

/**
 * Zapis poza magazynem (ekran „Leki”): wywołuje operację, potem odświeża dane.
 * Błąd zamienia na komunikat dla użytkownika (`error`).
 */
export function useSave() {
  const { refresh } = useStore();
  const supabase = useMemo(() => createClient(), []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async <T>(op: (s: Client) => Promise<T>): Promise<{ ok: true; value: T } | { ok: false }> => {
      setPending(true);
      setError(null);
      try {
        const value = await op(supabase);
        await refresh();
        return { ok: true, value };
      } catch (e) {
        setError(saveErrorMessage(e));
        return { ok: false };
      } finally {
        setPending(false);
      }
    },
    [supabase, refresh],
  );

  return { run, pending, error, setError };
}
