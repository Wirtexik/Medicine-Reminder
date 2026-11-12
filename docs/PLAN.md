# Leki – plan dalszej implementacji

> Stan na 2026-11-12. Specyfikacja: [PROJEKT.md](PROJEKT.md). System wizualny: [../DESIGN.md](../DESIGN.md).
> Kolejność kroków wynika z zależności. Krok oznaczony **⟵** wymaga ukończenia wskazanego wcześniejszego kroku.

---

## 0. Co już jest

- [x] Szkielet Next.js 16 (App Router, TypeScript, Tailwind v4), układ mobilny, dolny pasek Dziś · Leki · Zapasy, PWA manifest + ikona SVG.
- [x] **Ekran „Dziś”** (pełny): karty pór, odhaczanie i cofanie z ruchami stanu, „Odhacz całą porę”, zwijanie gotowej pory, nawigacja po dniach (dziś i wczoraj edytowalne, starsze tylko podgląd), kalendarz ze statusem dni, arkusz leku, tryb edycji kolejności (przeciąganie + strzałki), alert niskiego zapasu, baner offline, cofnięcie zmiany przy błędzie zapisu.
- [x] Logika domenowa w `src/lib/domain/`: wyliczanie checklisty z okresów, status dnia, prognoza zapasu (symulacja dzień po dniu), formatowanie dawek.
- [x] DESIGN.md + `.impeccable/design.json`, brief ekranu w `.impeccable/surfaces/`.
- [x] Dane z Supabase (krok 4); dane przykładowe usunięte.

---

## 1. Repozytorium i wdrożenie

- [x] `git init`, pierwszy commit (bez `.impeccable/mocks/`, `.impeccable/review/`, `.impeccable/config.local.json`), repo na GitHubie.
- [x] Projekt na Vercelu podpięty pod repo; domena `*.vercel.app`.
- [x] Zmienne środowiskowe na Vercelu (projekt Supabase połączony).
- [x] Te same zmienne lokalnie w `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 2. Baza danych Supabase ⟵ 1

Migracje w `supabase/migrations/` (Supabase CLI), zgodnie z PROJEKT.md §6.

> Wgrane 2026-11-12 przez SQL Editor (`20261112000000_init.sql`), sprawdzone przez REST: 11 tabel i RPC istnieją, rola `anon` nie ma dostępu.
> **Historia migracji CLI jest pusta.** Przed pierwszym `npm run db:push` (po `supabase login` + `supabase link`) uruchomić `npx supabase migration repair --status applied 20261112000000`, inaczej CLI spróbuje wgrać ją ponownie.
> Typy w `database.types.ts` są napisane ręcznie; po podpięciu CLI nadpisać je przez `npm run db:types`.
> Dodatkowo: triggery spójności (pora i opakowanie dawki należą do właściciela leku), strażnik daty także jako trigger na `intake_log`, a dawki z historią przyjęć są chronione przed usunięciem (`ON DELETE RESTRICT`).

- [x] Rozszerzenia: `btree_gist` (wymagane przez `EXCLUDE` na okresach), `pg_cron`, `pg_net`.
- [x] Tabele: `profiles`, `time_slots`, `medications`, `med_packages`, `dosing_periods`, `period_doses`, `period_dose_parts`, `intake_log`, `stock_movements`, `push_subscriptions`, `notification_log`.
- [x] Ograniczenia: brak nakładania się okresów (`EXCLUDE USING gist`), `UNIQUE (period_dose_id, date)` w `intake_log`, `UNIQUE (kind, ref_id, date)` w `notification_log`, `quantity > 0`.
- [x] Trigger: `stock_movements` → przeliczenie `med_packages.stock_cached`.
- [x] Trigger na `auth.users`: utworzenie `profiles` i 7 domyślnych pór dnia (lista w `src/lib/data/demo.ts` → `DEFAULT_SLOTS`).
- [x] **RLS na każdej tabeli**: `user_id = auth.uid()` bezpośrednio albo przez złączenie z `medications`.
- [x] Funkcje RPC (`security invoker`, jedna transakcja):
  - `take_dose(dose_id, date)` / `untake_dose(dose_id, date)`: wpis lub usunięcie w `intake_log` plus ruchy stanu;
  - `take_slot(dose_ids[], date)`;
  - `reorder_doses(dose_ids[])`;
  - `start_new_period(medication_id, from_date)`: zamknięcie bieżącego okresu na `from−1` i kopia dawek do nowego okresu.
- [x] Strażnik daty w funkcjach: odrzucić `date < (now() at time zone 'Europe/Warsaw')::date − 1` i daty przyszłe.
- [x] Wygenerować typy: `supabase gen types typescript` → `src/lib/data/database.types.ts`.

## 3. Logowanie ⟵ 2

- [x] `@supabase/ssr`: klient przeglądarkowy i serwerowy (`src/lib/supabase/`).
- [x] `src/proxy.ts` (w Next 16 Middleware nazywa się Proxy): odświeżanie sesji i przekierowanie niezalogowanych na `/logowanie`. To tylko optymistyczny filtr; właściwą ochroną jest RLS.
- [x] Ekran `/logowanie`: pole „Nazwa użytkownika” + hasło; `jan` → `jan@leki.local`. Jasny komunikat przy złym haśle. Bez rejestracji.
- [x] Publiczna rejestracja wyłączona w panelu Supabase (Authentication → Sign In / Providers → „Allow new users to sign up”); konta zakładane ręcznie (Add user, Auto Confirm). Sprawdzone 2026-11-12: `disable_signup: true`.
- [x] Wylogowanie i zmiana hasła w Ustawieniach (zmiana wymaga obecnego hasła, nowe min. 8 znaków).
- [x] Sprawdzić logowanie na prawdziwym koncie (lokalnie i na Vercelu).

## 4. Warstwa danych na Supabase ⟵ 2, 3

> Zrobione 2026-11-12: `src/lib/data/repository.ts` (zapytania i mapowanie na model domenowy) + `src/lib/data/store.tsx` (stan, optymistyczne zapisy).
> Interfejs `StoreProvider` doszedł o `loadError`/`reload` (ekran błędu wczytania z „Spróbuj ponownie”) i `loadedMonths`/`ensureMonths` (doczytywanie odhaczeń miesiącami); `reorder` zwraca teraz `Promise` i przy błędzie pokazuje toast.
> Zapisy idą przez kolejkę (kolejność RPC = kolejność kliknięć); przy błędzie cofana jest tylko ta zmiana, a dane są odświeżane z bazy. Odczyt, w trakcie którego zmieniono coś lokalnie, jest powtarzany.
> Po powrocie aplikacji na pierwszy plan dane są odświeżane, jeśli mają ponad 30 s (zmiany z innego urządzenia). Wylogowanie w innej karcie / wygaśnięcie sesji → `/logowanie`.
> **Nie sprawdzone na koncie z lekami:** w bazie nie ma jeszcze leków (dodawanie to krok 5). Zapytanie zagnieżdżone sprawdzone przez REST (parsuje się, relacje znalezione).

- [x] Zastąpić `StoreProvider` (localStorage) repozytorium Supabase o **tym samym interfejsie** (`data`, `today`, `setTaken`, `takeSlot`, `reorder`).
- [x] Odczyt: leki z opakowaniami, okresami i dawkami (jedno zapytanie z zagnieżdżeniami), `intake_log` dla zakresu dat (wybrany dzień ± miesiąc, miesiąc w kalendarzu; dziś i wczoraj zawsze), pory, profil.
- [x] Zapis przez RPC z p. 2; zachować optymistyczne odhaczanie i cofnięcie zmiany przy błędzie (`SaveError` → toast).
- [x] Usunąć dane przykładowe i sekcję „Dane przykładowe” w Ustawieniach.
- [x] Odświeżanie „dziś” po północy i po powrocie aplikacji na pierwszy plan (przeniesione; po północy doczytywany jest też nowy miesiąc).

## 5. Ekran „Leki” (faza 2) ⟵ 4

> Kod gotowy 2026-11-12. Trasy: `/leki` (lista), `/leki/nowy` (kreator), `/leki/[id]` (szczegóły), `/leki/[id]/okres/[periodId]` (edycja okresu). Komponenty w `src/components/meds/`, zapis w `src/lib/data/meds.ts`.
> **Wymaga migracji `supabase/migrations/20261112120000_meds_editing.sql`** (wgrać w SQL Editor; potem przy podpinaniu CLI także `migration repair --status applied 20261112120000`). Funkcje: `create_medication`, `save_period`, `replace_period_doses`, `delete_period`, `delete_medication`, `save_package`. Bez niej zapis kończy się komunikatem o brakującej migracji.
> Decyzje: forma leku jest stała po utworzeniu (wyznacza jednostki); krople i syrop nie mają mocy (liczone w kroplach / ml, „Butelka”); zmiana stanu opakowania w arkuszu zapisuje się jako ruch `correction`; usunąć można lek, okres lub dawkę tylko bez historii przyjęć (lek z historią się archiwizuje); edycja okresu, który już trwa, zmienia też minione dni (komunikat kieruje do „Od dnia… nowe dawkowanie”).
> **Plan dawkowania z etapów** (np. tydzień 40 mg → tydzień 30 mg → 20 mg do wizyty): edytor etapów w kreatorze i na `/leki/[id]/plan` („Od dnia… nowe dawkowanie”). Kolejny etap zaczyna się dzień po końcu poprzedniego i kopiuje jego dawki; każdy etap to osobny okres. Zapis: RPC `plan_periods` z migracji `20261112130000_dosing_plan.sql` (bieżący okres kończy się dzień przed planem, późniejsze okresy są zastępowane; odhaczenia od początku planu blokują zapis). `create_medication` przyjmuje listę `periods`. Arkusz „Od dnia…” usunięty (RPC `start_new_period` zostaje w bazie, nieużywane przez UI).
> Arkusz leku na ekranie „Dziś” ma link „Szczegóły i dawkowanie”. Dolny pasek jest w `Suspense` (wymóg `cacheComponents` dla tras z parametrem).
> **Nie sprawdzone w przeglądarce na koncie** (brak dostępu do logowania przy implementacji): typy, lint i `next build` przechodzą.

- [x] Lista leków: nazwa, aktualna dawka, „starczy do ~dd.MM”. Leki zarchiwizowane w osobnej, zwiniętej sekcji.
- [x] Szczegóły leku:
  - nazwa, forma, opis (jedno pole),
  - opakowania: moc, rozmiar opakowania, stan,
  - oś czasu okresów dawkowania,
  - przycisk „Od dnia… nowe dawkowanie” (RPC `start_new_period`),
  - próg alertu (domyślnie z profilu),
  - archiwizacja.
- [x] Kreator „+ Dodaj lek” w 4 krokach: nazwa i forma → opakowania → dawkowanie (pory, ilości z każdego opakowania, opcjonalna godzina, ułamki ½ ¼) → opis.
- [x] Edycja dawek w okresie z podglądem sumy („30 mg = 1 × 20 mg + 1 × 10 mg”).
- [x] Walidacja: brak nakładających się okresów (komunikat zamiast błędu bazy), ilość > 0, co najmniej jedno opakowanie.
- [x] Wgrać migrację `20261112120000_meds_editing.sql` (sprawdzone 2026-11-12: funkcje są w bazie).
- [x] Wgrać migrację `20261112130000_dosing_plan.sql` (sprawdzone 2026-11-12: `plan_periods` jest w bazie).
- [x] Przejść ścieżkę na koncie: dodanie leku, odhaczenie na „Dziś”, plan z kilku etapów, archiwizacja.

## 6. Ekran „Zapasy” (faza 4) ⟵ 4

- [ ] Sekcja „Kończą się”: leki poniżej progu, od najpilniejszego (gotowe: `lowStock()` w `src/lib/domain/forecast.ts`).
- [ ] Wszystkie leki: stan każdego opakowania, dni zapasu, „starczy do”; przy kilku mocach liczy się najsłabsze ogniwo.
- [ ] Akcje: „+ opakowanie” (ruch `purchase` o rozmiar opakowania) i „Korekta stanu” (ruch `correction`).
- [ ] Po dodaniu opakowania: jeśli zapas wraca powyżej progu, wyzerować `low_stock_notified_at`.
- [ ] Alert na ekranie „Dziś” już prowadzi do `/zapasy`.

## 7. Ustawienia ⟵ 3, 4

- [ ] Pory dnia: zmiana nazwy, kolejności, godziny przypomnienia, wyłączanie.
- [ ] Domyślny próg zapasu (7 dni).
- [ ] Włączenie powiadomień (p. 8).
- [ ] Zmiana hasła, wylogowanie.

## 8. Powiadomienia (faza 6) ⟵ 2, 7

- [ ] Service worker (`public/sw.js`): obsługa `push` i `notificationclick` (otwiera „Dziś” albo „Zapasy”).
- [ ] Klucze VAPID; klucz publiczny w zmiennej środowiskowej, prywatny tylko w sekretach Supabase.
- [ ] Ustawienia → „Włącz powiadomienia”: prośba o zgodę iOS, zapis subskrypcji w `push_subscriptions`. Na iOS działa tylko w PWA dodanej do ekranu głównego (iOS 16.4+); bez tego pokazać instrukcję „Udostępnij → Do ekranu początkowego”.
- [ ] Edge Function `notify` (biblioteka `web-push`), wywoływana przez `pg_cron` co 15 min. Czas liczony w `Europe/Warsaw`.
  - `slot_missed`: minęła `reminder_time` pory i są w niej nieodhaczone leki.
  - `exact_time`: minęła `exact_time` dawki i dawka nie jest odhaczona.
  - `low_stock`: o 9:00, zapas ≤ próg i alert jeszcze nie wysłany.
- [ ] Deduplikacja przez `notification_log`; usuwanie wygasłych subskrypcji (odpowiedź 404 lub 410 z serwera push).

## 9. PWA na iPhonie ⟵ 1

- [ ] `apple-touch-icon` 180×180 PNG (iOS nie używa ikony SVG z manifestu) i ikony PNG 192/512 w manifeście.
- [ ] Sprawdzić `apple-mobile-web-app-status-bar-style` (teraz `black-translucent`) z safe areas w obu motywach.
- [ ] Ekran startowy (splash) w kolorze `ground`.

## 10. Jakość

- [ ] Testy jednostkowe logiki domenowej (Vitest): `buildChecklist`, `dayMode`, `dayStatus`, `forecastMedication` (w tym zmiana dawki w przyszłym okresie i dawki odhaczone dziś), `formatQuantity` i odmiana „lek/leki/leków”.
- [ ] Testy funkcji SQL: strażnik daty, ruchy stanu przy odhaczeniu i cofnięciu, RLS (użytkownik A nie widzi danych B).
- [ ] Sprawdzenie na prawdziwym iPhonie:
  - krój SF Pro Rounded w tytułach i nazwach leków (zrzuty z Windows pokazują zamiennik),
  - „Większy tekst” w iOS (Dynamic Type),
  - VoiceOver na checkboxach i w trybie edycji,
  - przeciąganie palcem w trybie edycji.
- [ ] `/impeccable audit` dla każdego nowego ekranu przed oddaniem.

---

## Otwarte decyzje i znane uwagi

- **Aktywna zakładka w jasnym motywie** ma kolor `action-ink` (#b4471a), bo pomarańcz na białym nie spełnia AA. Jest czytelna, ale słabiej odróżnia się od nieaktywnych. Do oceny na telefonie.
- **Ekran „Dziś” otwarty o północy:** „dziś” odświeża się co minutę i po powrocie do aplikacji. Do ustalenia, czy wyświetlany dzień ma się wtedy sam przełączyć, jeśli ktoś przegląda wczoraj.
- **`allowedDevOrigins: ["192.168.1.*"]`** w `next.config.ts` służy tylko do podglądu z telefonu w sieci domowej. Nie wpływa na produkcję.
- **Przycisk „Odhacz całą porę”** pojawia się, gdy w porze zostały co najmniej 2 nieodhaczone dawki. Przy jednej wystarcza checkbox.
