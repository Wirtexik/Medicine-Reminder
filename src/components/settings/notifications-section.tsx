"use client";

import { Bell, BellOff, Share } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FormError, outlineButton, primaryButton } from "@/components/ui/controls";
import { createClient } from "@/lib/supabase/client";
import { disablePush, enablePush, PushPermissionError, readPushState, type PushState } from "@/lib/push";
import { settingsCard } from "./slots-section";

/** Ustawienia → Powiadomienia: zgoda iOS i subskrypcja push tego urządzenia. */
export function NotificationsSection() {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<PushState | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    readPushState().then(setState, () => setState("unsupported"));
  }, []);

  async function enable() {
    setPending(true);
    setError(null);
    try {
      await enablePush(supabase);
      setState("on");
    } catch (e) {
      if (e instanceof PushPermissionError) {
        if (e.permission === "denied") setState("denied");
        else setError("Nie udzielono zgody. Spróbuj ponownie i wybierz „Pozwól”.");
      } else {
        setError("Nie udało się włączyć powiadomień. Sprawdź połączenie i spróbuj ponownie.");
      }
    } finally {
      setPending(false);
    }
  }

  async function disable() {
    setPending(true);
    setError(null);
    try {
      await disablePush(supabase);
      setState("off");
    } catch {
      setError("Nie udało się wyłączyć powiadomień. Sprawdź połączenie i spróbuj ponownie.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="sec-push" className={`mt-4 px-5 py-5 ${settingsCard}`}>
      <h2 id="sec-push" className="text-body font-bold">
        Powiadomienia
      </h2>
      <p className="mt-1 text-meta text-text-2">
        Gdy minie godzina przypomnienia pory, a leki nie są odhaczone; o lekach z ustaloną godziną; raz, gdy zapas spadnie
        do progu (sprawdzane o 9:00).
      </p>

      {state === null && <div aria-hidden className="mt-4 h-12 rounded-full bg-card-muted" />}

      {state === "install" && (
        <div className="mt-4 rounded-[var(--radius-field)] bg-card-muted px-4 py-3 text-meta">
          <p className="font-semibold">Na iPhonie powiadomienia działają tylko z ekranu początkowego.</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-text-2">
            <li>
              W Safari dotknij <Share aria-label="Udostępnij" className="inline size-4 align-[-0.15em] text-text" />{" "}
              <span className="font-semibold text-text">Udostępnij</span>.
            </li>
            <li>
              Wybierz <span className="font-semibold text-text">Do ekranu początkowego</span>.
            </li>
            <li>Otwórz Leki z ikony na ekranie i wróć tutaj.</li>
          </ol>
        </div>
      )}

      {state === "unsupported" && (
        <p className="mt-4 text-meta font-semibold">Ta przeglądarka nie obsługuje powiadomień push.</p>
      )}

      {state === "misconfigured" && (
        <p className="mt-4 text-meta font-semibold">
          Powiadomienia nie są jeszcze skonfigurowane (brak klucza NEXT_PUBLIC_VAPID_PUBLIC_KEY).
        </p>
      )}

      {state === "denied" && (
        <p className="mt-4 text-meta">
          <span className="font-semibold">Powiadomienia są zablokowane.</span>{" "}
          <span className="text-text-2">Włącz je w Ustawieniach iPhone’a → Powiadomienia → Leki, potem wróć tutaj.</span>
        </p>
      )}

      {state === "off" && (
        <div className="mt-4">
          <button type="button" onClick={enable} disabled={pending} className={primaryButton}>
            <Bell aria-hidden className="size-5" />
            {pending ? "Włączanie…" : "Włącz powiadomienia"}
          </button>
          <FormError message={error} />
        </div>
      )}

      {state === "on" && (
        <div className="mt-4">
          <p role="status" className="flex items-center gap-2 px-1 text-meta font-semibold">
            <Bell aria-hidden className="size-4" />
            Włączone na tym urządzeniu
          </p>
          <button type="button" onClick={disable} disabled={pending} className={`mt-3 ${outlineButton}`}>
            <BellOff aria-hidden className="size-4" />
            {pending ? "Wyłączanie…" : "Wyłącz powiadomienia"}
          </button>
          <FormError message={error} />
        </div>
      )}
    </section>
  );
}
