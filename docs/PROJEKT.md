# Leki – projekt aplikacji (faza 0: projektowanie)

> Status: **decyzje podjęte (ankieta z 2026-11-11)**. Kod jeszcze nie powstał.
> Następny krok: makiety ekranów, schemat SQL, plan MVP.

---

## 1. Cel i zakres

Prywatna aplikacja mobilna (PWA na **iPhonie**, bez wersji desktopowej) do:

1. codziennej checklisty leków **przyjmowanych cyklicznie**,
2. dawkowania w **okresach** (np. do 15-go 30 mg, od 16-go 20 mg),
3. śledzenia zapasów, które zmniejszają się automatycznie po odhaczeniu,
4. prognozy, do kiedy wystarczy leków, i jednorazowego powiadomienia, gdy zapas spadnie poniżej progu,
5. przypomnień o lekach nieodhaczonych w danej porze dnia.

**Poza zakresem:** leki doraźne, suplementy, recepty (dane recept), eksport, kolory leków, tryb offline, wersja desktopowa, publiczna rejestracja.

---

## 2. Decyzje (podsumowanie ankiety)

| # | Temat | Decyzja |
|---|---|---|
| A1 | Użytkownicy | **Kilka osób, każda z osobnym kontem** i własnymi lekami |
| A2 | Logowanie | **Nazwa użytkownika + hasło**. Konta zakładane ręcznie w panelu Supabase, bez rejestracji w aplikacji |
| A3 | Offline | Nie. Aplikacja wymaga internetu |
| A4 | Telefon | **iPhone**. Push działa po dodaniu PWA do ekranu głównego (iOS 16.4+) |
| B1 | Formy | Tabletki/kapsułki (szt.), krople/syropy (ml / krople) |
| B2/B3 | Dawka | Dawka **łączna w mg** składana z kilku opakowań o różnej mocy. Przykład: 30 mg = 1×20 mg + 1×10 mg. Jedna pozycja na liście |
| B4/B5 | Doraźne / suplementy | Brak |
| B6 | Opis | **Jedno pole tekstowe** na dowolny opis |
| C1 | Częstotliwość | Codziennie, w **okresach dawkowania** (kolejne okresy z innymi dawkami) |
| C2 | Koniec okresu | Ostatni okres może być bezterminowy |
| C4 | Szybka zmiana | „**Od tego dnia nowe dawkowanie**” zamyka bieżący okres i otwiera nowy |
| D1 | Pory dnia | Domyślna lista z możliwością edycji |
| D2 | Godziny | Pory **bez godzin**. Godzina jest opcjonalna, tylko przy leku, który jej wymaga |
| D4 | Lek z godziną | W swojej porze dnia, z godziną obok nazwy |
| E1 | Kolejność | Tryb edycji: przytrzymanie i przeciągnięcie kafelka |
| E2 | Zaległe | Niezaznaczony lek z poprzedniego dnia zostaje oznaczony jako **pominięty** |
| E3 | Historia | **Kalendarz** + przycisk „**Odhacz całą porę**” |
| F1/F2 | Zapas | Rozmiar opakowania zapamiętany przy leku, „+N opak.” i ręczna korekta |
| F3 | Odznaczenie | Stan wraca automatycznie |
| G | Recepty | **Bez zapisywania recept.** Jest tylko ekran zapasów i alerty |
| G2 | Próg | Domyślnie **7 dni**, z możliwością zmiany dla konkretnego leku |
| H1 | Powiadomienia | Niezaznaczone z pory, leki z godziną, **jednorazowe** powiadomienie o niskim zapasie |
| H3 | Styl | Zwykłe powiadomienie iOS, zgodne z trybem „Nie przeszkadzać” |
| — | Sprawdzanie zapasu | Codziennie o **9:00** |
| I1 | Motyw | Automatyczny według systemu |
| I3 | Kolory leków | Brak |
| J1 | Eksport | Brak |
| J3/J4 | Infrastruktura | Supabase ✔, Vercel ✔, GitHub ✔, domena `*.vercel.app` |

---

## 3. Stack

| Warstwa | Wybór |
|---|---|
| Frontend | Next.js (App Router) + TypeScript, hostowany na Vercelu |
| UI | Tailwind CSS + shadcn/ui (Drawer, czyli bottom sheet), motyw `prefers-color-scheme` |
| Drag & drop | dnd-kit (obsługa przytrzymania na ekranie dotykowym) |
| Backend | Supabase: Postgres, Auth (e-mail/hasło), RLS |
| PWA | manifest + service worker (wymagane na iOS do powiadomień push) |
| Push | Web Push (VAPID), biblioteka `web-push` w Supabase Edge Function |
| Harmonogram | Supabase `pg_cron` co 15 min wywołuje Edge Function `notify` |
| Strefa czasowa | `Europe/Warsaw` (date-fns-tz) |

**Logowanie nazwą użytkownika:** Supabase Auth wymaga e-maila. Wpisujesz `jan`, a aplikacja loguje jako `jan@leki.local`. Konto zakładasz w panelu Supabase (Add user, Auto Confirm). Rejestracja publiczna jest wyłączona.

---

## 4. Ekrany

Dolny pasek: **Dziś · Leki · Zapasy**. Ikona ⚙ (ustawienia) jest w nagłówku.

### 4.1 Dziś
```
┌─────────────────────────────┐
│ ‹  Śr, 11 listopada  ›   📅 │
│ ⚠ 1 lek kończy się – Zapasy │
├─────────────────────────────┤
│ PRZED ŚNIADANIEM   [✓ całą] │
│ ☐ Euthyrox 50 µg            │
│   1 tabl.                   │
│ PO ŚNIADANIU       [✓ całą] │
│ ☑ Lek X 30 mg               │
│   1×20 mg + 1×10 mg         │
│ ☐ Lek Y 5 mg   · 14:00      │
│ NA NOC                      │
│ ☐ ...                       │
└─────────────────────────────┘
```
- Duża nazwa z dawką, pod spodem rozpis opakowań.
- Checkbox zmniejsza stan wszystkich opakowań składowych. Odznaczenie zwraca stan.
- Tap na nazwę otwiera bottom sheet z opisem, aktualnym okresem dawkowania i stanem.
- Strzałki ‹ › przełączają dni. Odhaczać można **dziś i wczoraj** (poprawka pomyłki). Starsze dni są tylko do podglądu.
- 📅 otwiera kalendarz: dzień zielony (wszystko wzięte), żółty (część), czerwony (nic).
- Tryb edycji (np. przycisk „Edytuj” albo przytrzymanie) pozwala przeciągać kafelki, żeby ustawić kolejność.

### 4.2 Leki
- Lista leków z nazwą, aktualną dawką i informacją „starczy do ~23.12”.
- Szczegóły leku:
  - nazwa, forma, opis (jedno pole tekstowe),
  - **opakowania (moce):** np. „20 mg, opak. 20 tabl., stan 34” oraz „10 mg, opak. 20 tabl., stan 12”,
  - **okresy dawkowania** (oś czasu): `01.11 – 15.11: po śniadaniu 30 mg (1×20 + 1×10)` i `od 16.11: po śniadaniu 20 mg (1×20)`,
  - przycisk „**Od dnia… nowe dawkowanie**”,
  - próg alertu (domyślnie 7 dni),
  - archiwizacja leku (koniec brania; historia zostaje).
- „+ Dodaj lek” w kilku krokach: nazwa i forma, opakowania, dawkowanie, opis.

### 4.3 Zapasy
- U góry „**Kończą się**”: leki poniżej progu, od najpilniejszego.
- Niżej wszystkie leki: stan każdego opakowania, dni zapasu i data „starczy do”.
- Akcje: „+ opakowanie” i „Korekta stanu”.
- Gdy lek ma kilka mocy, liczy się **najsłabsze ogniwo**, czyli opakowanie, które skończy się pierwsze.

### 4.4 Ustawienia
- Pory dnia: nazwa, kolejność i **godzina przypomnienia o niezaznaczonych** (domyślnie rano 12:00, popołudnie 17:00, wieczór 23:00).
- Domyślny próg zapasu (7 dni).
- Włączenie powiadomień (zgoda iOS i rejestracja subskrypcji push).
- Zmiana hasła, wylogowanie.

---

## 5. Logika domenowa

### 5.1 Pory dnia (domyślne)
| Pora | Grupa | Przypomnienie, jeśli nieodhaczone |
|---|---|---|
| Przed śniadaniem | rano | 12:00 |
| Po śniadaniu | rano | 12:00 |
| Przed obiadem | popołudnie | 17:00 |
| Po obiedzie | popołudnie | 17:00 |
| Przed kolacją | wieczór | 23:00 |
| Po kolacji | wieczór | 23:00 |
| Na noc | wieczór | 23:00 |

Godzina przypomnienia jest ustawiana dla każdej pory (edytowalna). Sposób przyjęcia (przed/po jedzeniu) wynika z nazwy pory, a szczegóły można dopisać w opisie leku.

### 5.2 Dawka złożona
- Lek ma **1..n opakowań (moc + rozmiar opakowania + stan)**.
- Dawka w porze to lista `(opakowanie, ilość sztuk)`, np. `[(20 mg, 1), (10 mg, 1)]`. Suma 30 mg jest wyliczana do wyświetlenia.
- Dozwolone są połówki i ćwiartki tabletek (`numeric`, np. 0.5). Krople i syropy liczone są w ml lub kroplach.

### 5.3 Okresy dawkowania
- Okres: `od` (wymagane), `do` (opcjonalne), oraz lista dawek w porach.
- Okresy jednego leku nie mogą na siebie nachodzić (constraint w bazie).
- „Od dnia X nowe dawkowanie” ustawia bieżącemu okresowi `do = X−1` i tworzy nowy okres `od = X` z kopią dawek do edycji.
- Lek bez aktywnego okresu w danym dniu nie pojawia się na liście tego dnia.

### 5.4 Checklista
- Lista na dany dzień jest **wyliczana** z okresów aktywnych w tym dniu i nie jest zapisywana z góry.
- Odhaczenie zapisuje wpis w `intake_log` oraz ruchy stanu (−) dla każdego opakowania składowego.
- Odznaczenie usuwa wpis i zapisuje ruchy (+).
- Edycja jest dozwolona dla dziś i wczoraj. Odhaczenie lub odznaczenie wczorajszej dawki koryguje stan tak samo jak dzisiejsze. RLS/funkcja w bazie odrzuca zmiany dla `date < current_date - 1`.
- Po północy nieodhaczone leki są traktowane jako „pominięte” (wyliczane, nie zapisywane), a kalendarz pokazuje to kolorem.

### 5.5 Prognoza zapasu
```
dzienne_zużycie(opakowanie) = Σ ilości tego opakowania we wszystkich porach aktywnego okresu
dni_zapasu(opakowanie)       = stan / dzienne_zużycie   (uwzględnia przyszłe okresy, symulacja dzień po dniu)
starczy_do(lek)              = min po opakowaniach
```
Symulacja dzień po dniu uwzględnia zaplanowane zmiany dawki, np. obniżkę od 16-go.

### 5.6 Alert niskiego zapasu (jednorazowy)
- Codziennie o 9:00: jeśli `dni_zapasu ≤ próg` i alert dla tego leku nie został jeszcze wysłany, aplikacja wysyła push i zapisuje `low_stock_notified_at`.
- Po dodaniu opakowania, gdy zapas wraca powyżej progu, flaga się zeruje i alert może przyjść ponownie przy następnym spadku.

---

## 6. Model danych (Supabase / Postgres)

```
profiles            id (= auth.users.id), username, low_stock_days default 7,
                    timezone default 'Europe/Warsaw'

time_slots          id, user_id, name, sort_order, reminder_time (time), is_active

medications         id, user_id, name, form (tablet|capsule|drops|syrup),
                    description text, low_stock_days (nullable → z profilu),
                    low_stock_notified_at, is_archived, created_at

med_packages        id, medication_id, strength_value, strength_unit (mg|µg|ml|krople),
                    unit_label (tabl.|kaps.|ml|krople), package_size,
                    stock_cached numeric       -- aktualizowany triggerem z stock_movements

dosing_periods      id, medication_id, valid_from date, valid_to date null,
                    EXCLUDE USING gist (medication_id WITH =, daterange(valid_from, valid_to,'[]') WITH &&)

period_doses        id, period_id, slot_id, exact_time time null, sort_order
period_dose_parts   id, period_dose_id, package_id, quantity numeric   -- 1×20mg + 1×10mg

intake_log          id, user_id, period_dose_id, date, taken_at
                    UNIQUE (period_dose_id, date)

stock_movements     id, package_id, delta numeric, reason (intake|purchase|correction),
                    intake_log_id null (ON DELETE CASCADE), created_at

push_subscriptions  id, user_id, endpoint, p256dh, auth, created_at
notification_log    id, user_id, kind (slot_missed|exact_time|low_stock),
                    ref_id, date, sent_at        UNIQUE (kind, ref_id, date)
```

- **Kolejność na liście:** `period_doses.sort_order` w obrębie pory. Przeciąganie zmienia tę wartość, a nowy okres dziedziczy kolejność po poprzednim.
- **RLS:** każda tabela jest filtrowana przez `user_id = auth.uid()` (bezpośrednio albo przez złączenie z `medications`).
- **Cofnięcie odhaczenia:** usunięcie wpisu z `intake_log` kaskadowo usuwa ruchy, a trigger przelicza `stock_cached`.

---

## 7. Powiadomienia

`pg_cron` co 15 min wywołuje Edge Function `notify`, która dla każdego użytkownika (czas `Europe/Warsaw`):

| Typ | Warunek | Treść |
|---|---|---|
| slot_missed | minęła `reminder_time` pory i w porze są nieodhaczone leki | „Nie odhaczono: Po śniadaniu (2 leki)” |
| exact_time | minęła `exact_time` dawki i dawka nie jest odhaczona | „Lek Y 5 mg – 14:00” |
| low_stock | 9:00, zapas ≤ próg, alert jeszcze nie wysłany | „Lek X kończy się – starczy do 18.11” |

- Deduplikacja przez `notification_log` (UNIQUE).
- Kliknięcie w powiadomienie otwiera aplikację na ekranie „Dziś” albo „Zapasy”.
- Powiadomienia są standardowe (iOS sam obsługuje tryb skupienia i „Nie przeszkadzać”).

---

## 8. Plan realizacji

| Faza | Zakres |
|---|---|
| **1. Fundament** | Repo, Next.js, Supabase, logowanie nazwą użytkownika, layout mobilny, dolny pasek, PWA manifest |
| **2. Leki** | CRUD leków, opakowania, okresy dawkowania, dawka złożona, domyślne pory |
| **3. Dziś** | Checklista, odhaczanie i cofanie, ruchy stanu, „odhacz całą porę”, tryb edycji kolejności |
| **4. Zapasy** | Ekran zapasów, prognoza (symulacja), dodawanie opakowań, korekty |
| **5. Historia** | Kalendarz, nawigacja po dniach |
| **6. Powiadomienia** | Service worker, VAPID, subskrypcje, Edge Function + pg_cron |

---

## 9. Założenia (potwierdzone)

1. **Odhaczanie wstecz:** można odhaczać i poprawiać dziś oraz wczoraj. Starsze dni są tylko do podglądu.
2. **Kolejność (E1):** przeciągasz kafelki w obrębie pory dnia, a kolejność zapamiętuje się dla leku w tej porze.
3. **Nowy okres** kopiuje dawki poprzedniego okresu, a Ty zmieniasz tylko to, co trzeba.
4. **Ilość w porze:** lek może mieć dawki w kilku porach jednego dnia (np. rano 30 mg, wieczorem 10 mg) w ramach jednego okresu.
