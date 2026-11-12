"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "../supabase/client";
import { monthOf, monthRange, shiftDay, todayKey } from "../dates";
import { dayMode } from "../domain/checklist";
import type { AppData, DateKey } from "../domain/types";
import * as repo from "./repository";

/*
  Magazyn danych po stronie klienta, oparty o Supabase.

  - Odczyt: pory, leki z opakowaniami i okresami, profil (fetchBase) oraz odhaczenia
    ładowane miesiącami (ensureMonths). Dziś i wczoraj są ładowane zawsze.
  - Zapis przez RPC (take_dose, untake_dose, take_slot, reorder_doses). Zmiana jest
    stosowana od razu (optymistycznie) i cofana, gdy zapis się nie uda (SaveError).
  - Zapisy idą po kolei (kolejka), więc szybkie odhaczenie i cofnięcie trafiają do bazy
    w tej samej kolejności. Odczyt, w trakcie którego zmieniono coś lokalnie, jest
    powtarzany, żeby stara odpowiedź nie nadpisała świeżej zmiany.
*/

export class SaveError extends Error {}

interface Store {
  /** null, dopóki pierwsze wczytanie się nie powiedzie. */
  data: AppData | null;
  today: DateKey;
  /** Pierwsze wczytanie nie powiodło się (np. brak sieci). */
  loadError: boolean;
  reload: () => void;
  /** Ponowne wczytanie po zapisie poza magazynem (ekran Leki). false = nie udało się. */
  refresh: () => Promise<boolean>;
  /** Miesiące („yyyy-MM”), których odhaczenia są już wczytane. */
  loadedMonths: ReadonlySet<string>;
  ensureMonths: (months: string[]) => void;
  setTaken: (doseId: string, date: DateKey, taken: boolean) => Promise<void>;
  takeSlot: (doseIds: string[], date: DateKey) => Promise<void>;
  reorder: (orderedDoseIds: string[]) => Promise<void>;
}

const StoreContext = createContext<Store | null>(null);

const EMPTY: AppData = { slots: [], medications: [], intakes: [], defaultLowStockDays: 7 };

/** Po powrocie do aplikacji dane są odświeżane, jeśli są starsze niż to. */
const STALE_MS = 30_000;

function applyIntake(data: AppData, doseId: string, date: DateKey, taken: boolean): AppData {
  const exists = data.intakes.some((i) => i.doseId === doseId && i.date === date);
  if (exists === taken) return data;

  // Ruchy stanu: każde opakowanie składowe −/+ ilość (PROJEKT.md §5.4). Baza robi to samo w RPC.
  const sign = taken ? -1 : 1;
  const medications = data.medications.map((med) => {
    const dose = med.periods.flatMap((p) => p.doses).find((d) => d.id === doseId);
    if (!dose) return med;
    return {
      ...med,
      packages: med.packages.map((pkg) => {
        const part = dose.parts.find((p) => p.packageId === pkg.id);
        return part ? { ...pkg, stock: +(pkg.stock + sign * part.quantity).toFixed(3) } : pkg;
      }),
    };
  });
  const intakes = taken
    ? [...data.intakes, { doseId, date }]
    : data.intakes.filter((i) => !(i.doseId === doseId && i.date === date));
  return { ...data, medications, intakes };
}

function applyOrder(data: AppData, order: Map<string, number>): AppData {
  return {
    ...data,
    medications: data.medications.map((med) => ({
      ...med,
      periods: med.periods.map((p) => ({
        ...p,
        doses: p.doses.map((d) => (order.has(d.id) ? { ...d, sortOrder: order.get(d.id)! } : d)),
      })),
    })),
  };
}

function replaceMonths(data: AppData, months: string[], intakes: AppData["intakes"]): AppData {
  const set = new Set(months);
  return { ...data, intakes: [...data.intakes.filter((i) => !set.has(monthOf(i.date))), ...intakes] };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [state, setState] = useState<AppData>(EMPTY);
  const stateRef = useRef<AppData>(EMPTY);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Ustalane dopiero w przeglądarce: „dziś” zależy od zegara urządzenia, nie od prerenderu.
  const [today, setToday] = useState<DateKey>("");
  const [loadedMonths, setLoadedMonths] = useState<ReadonlySet<string>>(() => new Set());

  const requestedMonths = useRef(new Set<string>()); // wczytane albo w trakcie
  const loadedRef = useRef(new Set<string>());
  const version = useRef(0); // rośnie przy każdej lokalnej zmianie
  const writeQueue = useRef<Promise<void>>(Promise.resolve());
  const lastLoad = useRef(0);
  const readyRef = useRef(false);

  const update = useCallback((fn: (d: AppData) => AppData) => {
    stateRef.current = fn(stateRef.current);
    setState(stateRef.current);
  }, []);

  const markLoaded = useCallback((months: string[]) => {
    months.forEach((m) => {
      requestedMonths.current.add(m);
      loadedRef.current.add(m);
    });
    setLoadedMonths(new Set(loadedRef.current));
  }, []);

  /** Odczyt, który nie nadpisze zmian zrobionych lokalnie w czasie jego trwania. null = zrezygnowano. */
  const consistent = useCallback(async <T,>(fetch: () => Promise<T>): Promise<T | null> => {
    for (let attempt = 0; attempt < 3; attempt++) {
      await writeQueue.current;
      const v = version.current;
      const result = await fetch();
      if (v === version.current) return result;
    }
    return null;
  }, []);

  const fetchMonths = useCallback(
    (months: string[]) => Promise.all(months.map((m) => repo.fetchIntakes(supabase, ...monthRange(m)))),
    [supabase],
  );

  const load = useCallback(async (): Promise<boolean> => {
    const t = todayKey();
    const months = [...new Set([monthOf(t), monthOf(shiftDay(t, -1)), ...loadedRef.current])];
    try {
      const result = await consistent(() => Promise.all([repo.fetchBase(supabase), fetchMonths(months)]));
      if (!result) return false;
      const [base, intakes] = result;
      update((d) => replaceMonths({ ...d, ...base }, months, intakes.flat()));
      markLoaded(months);
      lastLoad.current = Date.now();
      readyRef.current = true;
      setReady(true);
      setLoadError(false);
      return true;
    } catch {
      // Gdy dane już są, zostają na ekranie; błąd pokazujemy tylko przy pierwszym wczytaniu.
      if (!readyRef.current) setLoadError(true);
      return false;
    }
  }, [supabase, consistent, fetchMonths, update, markLoaded]);

  const ensureMonths = useCallback(
    (months: string[]) => {
      const todo = [...new Set(months)].filter((m) => !requestedMonths.current.has(m));
      if (todo.length === 0) return;
      todo.forEach((m) => requestedMonths.current.add(m));
      const forget = () => todo.forEach((m) => requestedMonths.current.delete(m));
      consistent(() => fetchMonths(todo))
        .then((result) => {
          if (!result) return forget();
          update((d) => replaceMonths(d, todo, result.flat()));
          markLoaded(todo);
        })
        .catch(forget); // spróbujemy ponownie przy następnym ensureMonths
    },
    [consistent, fetchMonths, update, markLoaded],
  );

  useEffect(() => {
    // Wczytanie z bazy po montażu; setState wywoływane asynchronicznie po odpowiedzi.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(todayKey());
    void load();

    // Północ w Warszawie: odśwież „dziś”; po powrocie na pierwszy plan także dane (inne urządzenie).
    const tick = () => setToday(todayKey());
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      tick();
      if (Date.now() - lastLoad.current > STALE_MS) void load();
    };
    const id = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", onVisible);

    // Sesja wygasła albo wylogowano w innej karcie.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.replace("/logowanie");
    });

    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      sub.subscription.unsubscribe();
    };
  }, [load, supabase, router]);

  // Po północy dochodzi nowy miesiąc „dziś”.
  useEffect(() => {
    if (today) ensureMonths([monthOf(today), monthOf(shiftDay(today, -1))]);
  }, [today, ensureMonths]);

  /** Zmiana optymistyczna: od razu lokalnie, potem RPC w kolejce; przy błędzie cofnięcie i odświeżenie. */
  const write = useCallback(
    (apply: (d: AppData) => AppData, revert: (d: AppData) => AppData, send: () => Promise<void>) => {
      version.current++;
      update(apply);
      const op = writeQueue.current.then(async () => {
        if (!navigator.onLine) throw new SaveError("offline");
        await send();
      });
      writeQueue.current = op.catch(() => {});
      return op.catch((e: unknown) => {
        version.current++;
        update(revert);
        void load(); // stan w bazie mógł się rozjechać z lokalnym
        throw e instanceof SaveError ? e : new SaveError("unknown", { cause: e });
      });
    },
    [update, load],
  );

  const setTaken = useCallback(
    async (doseId: string, date: DateKey, taken: boolean) => {
      if (!readyRef.current || dayMode(date, todayKey()) !== "editable") return;
      const already = stateRef.current.intakes.some((i) => i.doseId === doseId && i.date === date);
      if (already === taken) return;
      await write(
        (d) => applyIntake(d, doseId, date, taken),
        (d) => applyIntake(d, doseId, date, !taken),
        () => (taken ? repo.takeDose(supabase, doseId, date) : repo.untakeDose(supabase, doseId, date)),
      );
    },
    [write, supabase],
  );

  const takeSlot = useCallback(
    async (doseIds: string[], date: DateKey) => {
      if (!readyRef.current || dayMode(date, todayKey()) !== "editable") return;
      const taken = new Set(stateRef.current.intakes.filter((i) => i.date === date).map((i) => i.doseId));
      const changed = doseIds.filter((id) => !taken.has(id));
      if (changed.length === 0) return;
      await write(
        (d) => changed.reduce((acc, id) => applyIntake(acc, id, date, true), d),
        (d) => changed.reduce((acc, id) => applyIntake(acc, id, date, false), d),
        () => repo.takeSlot(supabase, changed, date),
      );
    },
    [write, supabase],
  );

  const reorder = useCallback(
    async (orderedDoseIds: string[]) => {
      if (!readyRef.current) return;
      const ids = new Set(orderedDoseIds);
      const previous = new Map(
        stateRef.current.medications
          .flatMap((m) => m.periods.flatMap((p) => p.doses))
          .filter((d) => ids.has(d.id))
          .map((d) => [d.id, d.sortOrder]),
      );
      const next = new Map(orderedDoseIds.map((id, i) => [id, i + 1]));
      await write(
        (d) => applyOrder(d, next),
        (d) => applyOrder(d, previous),
        () => repo.reorderDoses(supabase, orderedDoseIds),
      );
    },
    [write, supabase],
  );

  const reload = useCallback(() => {
    setLoadError(false);
    void load();
  }, [load]);

  const data = ready ? state : null;
  const value = useMemo(
    () => ({ data, today, loadError, reload, refresh: load, loadedMonths, ensureMonths, setTaken, takeSlot, reorder }),
    [data, today, loadError, reload, load, loadedMonths, ensureMonths, setTaken, takeSlot, reorder],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore poza StoreProvider");
  return ctx;
}
