import { CloudOff } from "lucide-react";
import { primaryPill } from "@/components/ui/buttons";

/** Szkielet albo błąd pierwszego wczytania danych (ekrany poza „Dziś”). */
export function LoadState({ error, onRetry }: { error: boolean; onRetry: () => void }) {
  if (!error) return <Skeleton />;
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

export function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Wczytywanie" className="px-4 pt-[max(3.5rem,calc(env(safe-area-inset-top)+3rem))]">
      <div className="h-8 w-40 rounded-full bg-card-muted" />
      <div className="mt-6 h-72 rounded-[var(--radius-card)] bg-card-muted" />
    </div>
  );
}
