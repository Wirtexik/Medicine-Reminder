"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/data/store";

// Do usunięcia razem z danymi przykładowymi (docs/PLAN.md §4).
export function DemoSection() {
  const { resetDemo } = useStore();
  const [done, setDone] = useState(false);

  return (
    <section className="mt-4 rounded-[var(--radius-card)] bg-card px-5 py-5 shadow-[var(--shadow)]">
      <h2 className="text-body font-bold">Dane przykładowe</h2>
      <p className="mt-1 max-w-[46ch] text-meta text-text-2">
        Lista leków nie jest jeszcze połączona z kontem. Leki i historia na ekranie Dziś to dane przykładowe zapisane
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
  );
}
