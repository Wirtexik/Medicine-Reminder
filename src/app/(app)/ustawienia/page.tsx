"use client";

import { ChevronLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/data/store";

export default function SettingsPage() {
  const { resetDemo } = useStore();
  const [done, setDone] = useState(false);

  return (
    <div className="px-5 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="-mx-2 flex h-11 items-center">
        <Link href="/" className="flex h-11 items-center gap-1 rounded-full px-2 text-body font-medium">
          <ChevronLeft aria-hidden className="size-6" />
          Dziś
        </Link>
      </div>
      <h1 className="mt-2 font-rounded text-title font-bold tracking-[-0.02em]">Ustawienia</h1>

      <section className="mt-6 rounded-[var(--radius-card)] bg-card px-5 py-5 shadow-[var(--shadow)]">
        <h2 className="text-body font-bold">Dane przykładowe</h2>
        <p className="mt-1 max-w-[46ch] text-meta text-text-2">
          Aplikacja nie jest jeszcze połączona z kontem. Leki i historia na ekranie Dziś to dane przykładowe zapisane
          tylko w tej przeglądarce.
        </p>
        <button
          type="button"
          onClick={() => {
            resetDemo();
            setDone(true);
          }}
          className="mt-4 flex h-12 items-center gap-2 rounded-full border-[1.5px] border-line px-5 text-meta font-semibold"
        >
          <RotateCcw aria-hidden className="size-4" />
          Przywróć dane przykładowe
        </button>
        <p role="status" className="mt-2 min-h-[1.3em] text-meta text-text-2">
          {done ? "Przywrócono dane przykładowe." : ""}
        </p>
      </section>

      <p className="mt-6 max-w-[46ch] px-1 text-meta text-text-2">
        Pory dnia, próg zapasu, powiadomienia i konto pojawią się tutaj w kolejnych fazach.
      </p>
    </div>
  );
}
