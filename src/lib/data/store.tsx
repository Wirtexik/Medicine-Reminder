"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { todayKey } from "../dates";
import { dayMode } from "../domain/checklist";
import type { AppData, DateKey } from "../domain/types";
import { buildDemoData } from "./demo";

/*
  Magazyn danych po stronie klienta. Na razie zapis w localStorage (tryb demo);
  operacje mają asynchroniczny kształt jak przyszłe wywołania Supabase:
  zmiana jest stosowana od razu (optymistycznie) i cofana, gdy zapis się nie uda.
*/

const STORAGE_KEY = "leki-demo-v1";

export class SaveError extends Error {}

interface Store {
  data: AppData | null;
  today: DateKey;
  setTaken: (doseId: string, date: DateKey, taken: boolean) => Promise<void>;
  takeSlot: (doseIds: string[], date: DateKey) => Promise<void>;
  reorder: (orderedDoseIds: string[]) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<Store | null>(null);

function applyIntake(data: AppData, doseId: string, date: DateKey, taken: boolean): AppData {
  const exists = data.intakes.some((i) => i.doseId === doseId && i.date === date);
  if (exists === taken) return data;

  // Ruchy stanu: każde opakowanie składowe −/+ ilość (PROJEKT.md §5.4).
  const sign = taken ? -1 : 1;
  const medications = data.medications.map((med) => {
    const dose = med.periods.flatMap((p) => p.doses).find((d) => d.id === doseId);
    if (!dose) return med;
    return {
      ...med,
      packages: med.packages.map((pkg) => {
        const part = dose.parts.find((p) => p.packageId === pkg.id);
        return part ? { ...pkg, stock: +(pkg.stock + sign * part.quantity).toFixed(2) } : pkg;
      }),
    };
  });
  const intakes = taken
    ? [...data.intakes, { doseId, date }]
    : data.intakes.filter((i) => !(i.doseId === doseId && i.date === date));
  return { ...data, medications, intakes };
}

async function persist(data: AppData): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    throw new SaveError("offline");
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  // Ustalane dopiero w przeglądarce: „dziś” zależy od zegara urządzenia, nie od prerenderu.
  const [today, setToday] = useState<DateKey>("");
  const dataRef = useRef<AppData | null>(null);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    const key = todayKey();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    let loaded: AppData | null = null;
    if (raw) {
      try {
        loaded = JSON.parse(raw) as AppData;
      } catch {
        loaded = null;
      }
    }
    if (!loaded) {
      loaded = buildDemoData(key);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));
    }
    // Jednorazowe wczytanie z zewnętrznego magazynu po montażu (localStorage nie istnieje na serwerze).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(key);
    setData(loaded);

    // Północ w Warszawie: odśwież „dziś”, gdy aplikacja wraca na pierwszy plan.
    const refresh = () => setToday(todayKey());
    const id = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const commit = useCallback(async (next: AppData, prev: AppData) => {
    dataRef.current = next;
    setData(next);
    try {
      await persist(next);
    } catch (e) {
      dataRef.current = prev;
      setData(prev);
      throw e instanceof SaveError ? e : new SaveError("unknown");
    }
  }, []);

  const setTaken = useCallback(
    async (doseId: string, date: DateKey, taken: boolean) => {
      const prev = dataRef.current;
      if (!prev || dayMode(date, todayKey()) !== "editable") return;
      await commit(applyIntake(prev, doseId, date, taken), prev);
    },
    [commit],
  );

  const takeSlot = useCallback(
    async (doseIds: string[], date: DateKey) => {
      const prev = dataRef.current;
      if (!prev || dayMode(date, todayKey()) !== "editable") return;
      const next = doseIds.reduce((acc, id) => applyIntake(acc, id, date, true), prev);
      await commit(next, prev);
    },
    [commit],
  );

  const reorder = useCallback((orderedDoseIds: string[]) => {
    const prev = dataRef.current;
    if (!prev) return;
    const order = new Map(orderedDoseIds.map((id, i) => [id, i + 1]));
    const next: AppData = {
      ...prev,
      medications: prev.medications.map((med) => ({
        ...med,
        periods: med.periods.map((p) => ({
          ...p,
          doses: p.doses.map((d) => (order.has(d.id) ? { ...d, sortOrder: order.get(d.id)! } : d)),
        })),
      })),
    };
    setData(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const resetDemo = useCallback(() => {
    const fresh = buildDemoData(todayKey());
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    setData(fresh);
  }, []);

  const value = useMemo(
    () => ({ data, today, setTaken, takeSlot, reorder, resetDemo }),
    [data, today, setTaken, takeSlot, reorder, resetDemo],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore poza StoreProvider");
  return ctx;
}
