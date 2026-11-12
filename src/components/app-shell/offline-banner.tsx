"use client";

import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Aplikacja nie działa offline (PROJEKT.md A3) – mówimy to wprost. */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-text px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 text-meta font-semibold text-ground"
    >
      <WifiOff aria-hidden className="size-4" />
      Brak internetu. Zmiany nie zostaną zapisane.
    </div>
  );
}
