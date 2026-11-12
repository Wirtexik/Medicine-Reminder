"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { syncPush } from "@/lib/push";

/** Rejestruje service worker i odnawia subskrypcję push przy starcie aplikacji. Nic nie rysuje. */
export function PushSync() {
  useEffect(() => {
    syncPush(createClient()).catch(() => {
      // Bez sieci albo bez sesji: spróbujemy przy następnym uruchomieniu.
    });
  }, []);
  return null;
}
