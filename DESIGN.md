---
name: Leki
description: Prywatna checklista leków na iPhone'a; ciepłe karty pór dnia, jeden kolor do naciskania.
colors:
  action: "#ff8a3d"
  action-press: "#f47a2b"
  on-action: "#1a1410"
  action-ink: "#ff8a3d"
  ground: "#1a1816"
  card: "#262321"
  card-muted: "#211e1c"
  line: "#36312d"
  text: "#f4efea"
  text-2: "#b8ada3"
  text-3: "#93887f"
  ok: "#5cc28a"
  part: "#e8b84a"
  miss: "#ef7a6e"
  warn: "#f2b25c"
  warn-soft: "#3a2c1e"
  action-light: "#ff7a45"
  action-press-light: "#f26a33"
  on-action-light: "#241a14"
  action-ink-light: "#b4471a"
  ground-light: "#faf3ea"
  card-light: "#ffffff"
  card-muted-light: "#f4ece2"
  line-light: "#e9dfd3"
  text-light: "#2b241f"
  text-2-light: "#6c5f56"
  text-3-light: "#74665b"
  ok-light: "#23704a"
  part-light: "#c58a12"
  miss-light: "#a8352c"
  warn-light: "#9a4f0a"
  warn-soft-light: "#fbe6cf"
typography:
  title:
    fontFamily: "ui-rounded, SF Pro Rounded, -apple-system, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1.8rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  med:
    fontFamily: "ui-rounded, SF Pro Rounded, -apple-system, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  slot:
    fontFamily: "ui-rounded, SF Pro Rounded, -apple-system, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1.18rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "-apple-system, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.35
    fontFeature: "tnum"
  meta:
    fontFamily: "-apple-system, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.88rem"
    fontWeight: 400
    lineHeight: 1.3
    fontFeature: "tnum"
  caption:
    fontFamily: "-apple-system, SF Pro Text, system-ui, Segoe UI, Roboto, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 600
    lineHeight: 1.25
    fontFeature: "tnum"
rounded:
  field: "0.9rem"
  card: "1.35rem"
  sheet: "1.75rem"
  full: "9999px"
spacing:
  screen-x: "1rem"
  card-x: "1.25rem"
  stack: "0.75rem"
  target: "2.75rem"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    height: "3.25rem"
    width: "100%"
  button-primary-active:
    backgroundColor: "{colors.action-press}"
  button-outline:
    textColor: "{colors.text}"
    typography: "{typography.meta}"
    rounded: "{rounded.full}"
    height: "3rem"
    width: "100%"
  button-round:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    rounded: "{rounded.full}"
    size: "2.75rem"
  dose-check-checked:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.full}"
    size: "1.9rem"
  slot-card-current:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.card}"
    padding: "0 1.25rem"
  slot-card:
    backgroundColor: "{colors.card-muted}"
    rounded: "{rounded.card}"
    padding: "0 1.25rem"
  stock-alert:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "0.75rem 1rem"
  time-chip:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.text}"
    typography: "{typography.meta}"
    rounded: "{rounded.full}"
    padding: "0.125rem 0.5rem"
  time-chip-overdue:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
  sheet:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.sheet}"
    padding: "0.5rem 1.25rem 1.5rem"
  tab-bar-active:
    textColor: "{colors.action-ink}"
    height: "3.4rem"
  tab-bar:
    textColor: "{colors.text-2}"
    height: "3.4rem"
  toast:
    backgroundColor: "{colors.text}"
    textColor: "{colors.ground}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0.75rem 1rem"
---

# Design System: Leki

## Overview

**Creative North Star: "Ciepła kolumna dnia"**

Dzień to kolumna miękkich kart, jedna na porę dnia, na ciepło zabarwionym ciemnym tle. Karta bieżącej pory jest jedyną uniesioną: jaśniejsza, z cieniem, z dużymi wierszami leków i pełnym pomarańczowym przyciskiem. Pozostałe pory leżą płasko i ciszej, a pora skończona zwija się w miejscu do jednej linii. Całość ma się czuć jak natywna aplikacja iOS w jednej ręce, nie jak kliniczna lista ani tablica nawyków.

Gęstość jest celowo niska: duże promienie, hojne wcięcia, wiersze leków nie niższe niż 4.25rem, każdy cel dotyku co najmniej 44pt. Jedyny nasycony kolor na ekranie to zawsze coś, co można nacisnąć. Kolory stanów (wzięte, część, pominięte, ostrzeżenie) niosą wyłącznie znaczenie i nigdy nie są dekoracją.

Motyw ciemny jest główny; jasny przychodzi z systemu (`prefers-color-scheme`) i powtarza ten sam układ: ciepłe kremowe tło z białymi kartami.

**Key Characteristics:**
- Ciepłe, grafitowe karty na brązowo-czarnym tle (ciemny) lub białe karty na kremie (jasny).
- Jeden kolor akcji (pomarańcz) z ciemnym tekstem, zarezerwowany dla rzeczy do naciśnięcia.
- Systemowy krój SF Pro z Dynamic Type; SF Pro Rounded dla tytułów i nazw leków.
- Głębia przez jedną uniesioną kartę, reszta warstwuje się tonem.
- Ruch krótki, wygaszany (expo out), bez odbicia.

## Colors

Ciepła, przygaszona paleta neutralna z jednym pomarańczowym głosem akcji i czterema kolorami stanu, które mówią tylko o znaczeniu. Wartości w frontmatter: klucze bez sufiksu to motyw ciemny (główny), `-light` to motyw jasny.

### Primary
- **Pomarańcz akcji** (`action`, jasny `action-light`): wypełnienie przycisku „Odhacz całą porę” w bieżącej porze, wypełnione kółko odhaczonej dawki, aktywny przycisk „Gotowe” w trybie edycji, tło zaznaczenia tekstu (35% mieszanki). Stan wciśnięcia to `action-press`.
- **Akcja jako sam tekst lub ikona** (`action-ink`, jasny `action-ink-light` #b4471a): aktywna zakładka dolnego paska. W ciemnym motywie równa `action`; w jasnym przyciemniona, bo pomarańcz `action-light` na białym ma ok. 2,6:1 i nie spełnia AA.
- **Tekst na akcji** (`on-action`): zawsze ciemny, prawie czarny brąz. Na pomarańczu nigdy nie ma białego tekstu.

### Tertiary
- **Zieleń wziętych** (`ok`): licznik „✓ 1/1” zwiniętej pory, pełna kropka „wszystko wzięte” w kalendarzu.
- **Bursztyn częściowy** (`part`): pół-wypełniona kropka „część wzięta” w kalendarzu.
- **Ceglasta czerwień pominiętych** (`miss`): pusty pierścień „nic nie wzięte”, przerywane kółko i dopisek „· pominięta” na przeszłych dniach.
- **Ostrzeżenie zapasu** (`warn` na `warn-soft`): ikona karty niskiego zapasu, chip godziny po terminie. W jasnym motywie wszystkie kolory stanu są przyciemnione tak, by mieć co najmniej 4.5:1 na `card-muted`.

### Neutral
- **Ciepła noc** (`ground`): tło ekranu; także tło chipa godziny wewnątrz karty.
- **Ciepły grafit** (`card`): karta bieżącej pory, okrągłe przyciski nagłówka, bottom sheet.
- **Przygaszony grafit** (`card-muted`): karty pozostałych pór, pusty stan, szkielety ładowania, pola w arkuszu leku, okrągłe przyciski w arkuszu.
- **Linia** (`line`): separatory wierszy w karcie, górna krawędź paska zakładek, uchwyt arkusza.
- **Ciepła biel** (`text`), **tekst drugi** (`text-2`), **tekst trzeci** (`text-3`): treść, metadane i rozbicie dawki, ikony nieaktywne, podpowiedzi w polach i dni spoza miesiąca. `text-3` ma co najmniej 4.5:1 także na `card-muted` (tło pól), w obu motywach. `text` służy też jako odwrócone tło tostu, banera offline i wybranego dnia w kalendarzu oraz jako kolor obrysu fokusu.

### Named Rules
**The Press-Only Orange Rule.** Pomarańcz pojawia się tylko na elemencie, który można nacisnąć, albo na wypełnionym checkboxie dawki. Nigdy na tekście informacyjnym, ikonie stanu, tle karty ani ozdobie.

**The Dark-On-Orange Rule.** Tekst i ikony na pomarańczu mają zawsze kolor `on-action`.

**The Meaning-Only State Rule.** `ok`, `part`, `miss`, `warn` oznaczają stan i nic poza tym. Status w kalendarzu ma zawsze kształt oprócz koloru: pełna kropka, pół kropki, pusty pierścień.

## Typography

**Body Font:** systemowy SF Pro Text (`-apple-system`, z fallbackiem system-ui, Segoe UI, Roboto)
**Display Font:** SF Pro Rounded (`ui-rounded`, z fallbackiem na krój systemowy)

**Character:** Jeden systemowy krój w dwóch odmianach. Zaokrąglona odmiana dodaje ciepła tytułom i nazwom leków bez wprowadzania obcego kroju; zwykła odmiana niesie całą resztę.

Skala jest względna do `1rem`, a `1rem` to rozmiar tekstu iOS: na iOS `html` dostaje `font: -apple-system-body`, więc całość rośnie z ustawieniem „Większy tekst”; poza iOS bazą jest 17px (106.25%). Cyfry są tabelaryczne w całym body.

### Hierarchy
- **Title** (rounded, 700, 1.8rem, 1.05, -0.02em): data w nagłówku „12 listopada”, nazwa leku w arkuszu.
- **Med** (rounded, 600, 1.3rem, 1.15, -0.01em): nazwa leku z sumaryczną dawką w wierszu.
- **Slot** (rounded, 700, 1.18rem, 1.2): tytuł bieżącej pory. Pozostałe pory używają rounded 700 w rozmiarze body; zwinięta pora rounded 600 w `text-2`.
- **Body** (400–600, 1rem, 1.35): treść, przyciski, tost, karta zapasu. Opis leku ograniczony do 60ch.
- **Meta** (400–600, 0.88rem, 1.3): rozbicie dawki, liczniki „0 z 3”, dzień tygodnia nad datą, chip godziny.
- **Caption** (600, 0.8rem, 1.25): skróty dni tygodnia w kalendarzu.

### Named Rules
**The Rounded-For-Names Rule.** SF Pro Rounded tylko dla daty, tytułów pór, nazw leków i tytułów arkuszy. Tekst ciągły, metadane i przyciski zostają w SF Pro Text.

**The Unbroken Dose Rule.** Liczba i jednostka są zawsze połączone twardą spacją (`20 mg`, `1 tabl.`), a suma dawki przy nazwie leku nie łamie się (`white-space: nowrap`).

## Layout

Jedna kolumna mobilna. Ekran ma wcięcie poziome 1rem, karty 1.25rem wewnętrznego wcięcia, odstęp między kartami 0.75rem. Nagłówek szanuje `safe-area-inset-top`; pasek zakładek i arkusze szanują `safe-area-inset-bottom`. Pasek zakładek i arkusze są ograniczone do `max-width: 32rem` i wyśrodkowane.

Rytm pionowy: nagłówek pory min. 3.5rem, wiersz leku min. 4.25rem, pasek zakładek 3.4rem. Cele dotyku 2.75rem (44pt), checkbox dawki 3rem pola dotyku z 1.9rem widocznym kółkiem.

Kolejność kart odpowiada kolejności pór dnia i nie zmienia się po odhaczeniu; skończona pora zwija się na swoim miejscu.

## Elevation & Depth

Hybryda: warstwy tonalne plus jeden cień. Tło `ground`, karty pór `card-muted`, a karta bieżącej pory `card` z cieniem `--shadow`. Ten sam cień dostaje przeciągany wiersz w trybie edycji i tost. Arkusz leży na scrimie (`--scrim`), pasek zakładek jest półprzezroczysty (`--bar`) z rozmyciem tła.

### Shadow Vocabulary
- **Uniesienie** (ciemny: `0 1px 2px rgb(0 0 0 / 0.3), 0 8px 20px -10px rgb(0 0 0 / 0.55)`; jasny: `0 1px 2px rgb(60 40 20 / 0.06), 0 6px 18px -8px rgb(60 40 20 / 0.18)`): karta bieżącej pory, przeciągany wiersz, tost.

### Named Rules
**The One Raised Card Rule.** Na ekranie „Dziś” uniesiona jest tylko karta bieżącej pory. Pozostałe karty są płaskie i ciszej tonowane; tylko bieżąca pora ma pełny pomarańczowy przycisk.

## Shapes

Miękkie, duże zaokrąglenia i pełne kółka. Karty mają 1.35rem, pola i tost 0.9rem, górne rogi arkusza 1.75rem. Wszystkie przyciski, checkboxy, chipy i uchwyt arkusza są w pełni zaokrąglone. Brak obramowań kart; linie istnieją tylko jako separatory wierszy (`line`) i jako obrys przycisku drugorzędnego (1.5px, `text` w 24% krycia).

## Components

### Buttons
Dotykowe, pełne kapsuły, które lekko się wciskają.
- **Shape:** pełna kapsuła (9999px).
- **Primary („Odhacz całą porę” w bieżącej porze):** `action` z `on-action`, wysokość 3.25rem, pełna szerokość, body 600, ikona podwójnego znacznika.
- **Outline (ta sama akcja w pozostałych porach):** przezroczyste tło, obrys 1.5px z `text` w 24%, tekst `text`, wysokość 3rem, meta 600.
- **Round icon button:** 2.75rem, `card` (w arkuszu `card-muted`), ikona 24px; w nagłówku ‹ › i kalendarz.
- **Text button:** „Edytuj”, „Wróć do dziś”, 2.75rem wysokości; „Gotowe” w trybie edycji przechodzi na `action`.
- **Press:** `scale(0.98)` dla szerokich przycisków, `scale(0.9)` dla okrągłych, 150ms; wyłączone mają 40% krycia. Fokus: obrys 2.5px `focus` z odsunięciem 2px.

### Dose Check (sygnatura)
Okrągły checkbox dawki: 3rem pola dotyku, 1.9rem kółko z obrysem 2.5px `text-2`. Zaznaczenie wypełnia kółko `action` i pokazuje znacznik `on-action` z animacją `check-pop` (280ms, expo out, skala 0.55 → 1). Na dniach tylko do podglądu: wzięta to wypełnione kółko `text-3`, pominięta to przerywany pierścień `miss`, zaplanowana to przerywany pierścień `text-3`.

### Cards / Containers
- **Corner Style:** 1.35rem.
- **Background:** `card` dla bieżącej pory, `card-muted` dla pozostałych i dla pustego stanu.
- **Shadow Strategy:** tylko bieżąca pora (patrz Elevation & Depth).
- **Border:** brak.
- **Internal Padding:** 1.25rem poziomo; wiersze leków dzielone liniami `line`.

### Slot Card (sygnatura)
Nagłówek pory z tytułem po lewej i licznikiem „0 z 3” po prawej. Skończona pora zwija się do jednej linii („Przed śniadaniem ✓ 1/1” w `ok`, strzałka rozwijania) po 650ms zatrzymania, animacją `grid-template-rows` 420ms expo out. Dotknięcie rozwija ją w miejscu.

### Stock Alert
Karta-link o promieniu karty na `warn-soft`, ikona trójkąta w `warn`, tytuł body 600 w `text`, data „starczy do” w meta `text-2`, chevron po prawej. Nie używa pomarańczu akcji.

### Chips
Chip godziny w wierszu leku: kapsuła na `ground` z ikoną zegara i godziną; po terminie (i nieodhaczona) przechodzi na `warn-soft` / `warn`.

### Navigation
Dolny pasek zakładek Dziś · Leki · Zapasy: stały, `--bar` z rozmyciem, górna linia `line`, wysokość 3.4rem plus safe area. Ikona 24px nad etykietą 600; aktywna zakładka w `action-ink` z grubszym obrysem ikony (2.4), nieaktywne w `text-2`.

### Bottom Sheet
Arkusz vaul: `card`, górne rogi 1.75rem, uchwyt 2.5rem × 0.375rem w `line`, maksymalnie 88dvh, scrim `--scrim`. Kalendarz: siatka 7 kolumn z dniami 2.75rem; wybrany dzień odwrócony (`text` / `ground`), dzisiejszy z wewnętrznym pierścieniem `text`, pod numerem znacznik statusu.

### Toast / Offline Banner
Odwrócone kolory (`text` tło, `ground` tekst). Tost nad paskiem zakładek, promień 0.9rem, cień uniesienia, wjazd `toast-in` 240ms expo out, znika po 4.5s. Baner offline przyklejony u góry, meta 600.

### Motion
Jedna krzywa: `--ease-out-expo` (`cubic-bezier(0.16, 1, 0.3, 1)`). Czasy: 150ms wciśnięcie, 200ms checkbox, 240ms tost, 280ms znacznik, 300ms tło karty i obrót strzałki, 420ms zwijanie pory. `prefers-reduced-motion` skraca wszystko do 1ms.

## Do's and Don'ts

### Do:
- **Do** używać `action` wyłącznie dla elementów do naciśnięcia i wypełnionego checkboxa, zawsze z `on-action` na wierzchu.
- **Do** unosić tylko kartę bieżącej pory (`card` + cień) i dawać pełny pomarańczowy przycisk tylko jej; inne pory dostają `card-muted` i przycisk z obrysem.
- **Do** utrzymywać cele dotyku co najmniej 2.75rem (44pt) i wiersze leków co najmniej 4.25rem.
- **Do** łączyć liczbę z jednostką twardą spacją i trzymać cyfry tabelaryczne.
- **Do** dawać statusom kształt oprócz koloru (pełna kropka / pół kropki / pusty pierścień; przerywany pierścień dla pominiętej).
- **Do** skalować typografię względem `1rem` = rozmiar tekstu iOS, by działał Dynamic Type.
- **Do** zwijać skończoną porę w miejscu, krzywą `--ease-out-expo`, bez zmiany kolejności kart.

### Don't:
- **Don't** używać pomarańczu na tekście informacyjnym, ikonach stanu, tłach kart ani ozdobach.
- **Don't** stawiać białego tekstu na pomarańczu.
- **Don't** używać kolorów stanu jako akcentów ani dekoracji.
- **Don't** używać krzywych z odbiciem (overshoot) ani sprężyn przekraczających cel.
- **Don't** dodawać kickerów, eyebrowów ani nadtytułów nad nagłówkami; linia „Dziś · czwartek” nad datą to dane, nie ozdoba.
- **Don't** wprowadzać grywalizacji (serie, pierścienie postępu, motywujące komunikaty) ani klinicznej grupowanej listy.
