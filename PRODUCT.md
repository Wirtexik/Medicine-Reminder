# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

PWA instalowana na ekranie głównym iPhone'a (iOS 16.4+, wymagane do Web Push). Tylko widok mobilny, bez wersji desktopowej. Projekt powinien zachowywać się jak natywna aplikacja iOS (safe areas, gesty, bottom sheet), ale język projektowy pozostaje webowy.

## Stack

Decyzja użytkownika (docs/PROJEKT.md §3): Next.js (App Router) + TypeScript na Vercelu, Tailwind CSS + shadcn/ui (Drawer jako bottom sheet), dnd-kit, Supabase (Postgres, Auth, RLS, Edge Functions, pg_cron), Web Push (VAPID), strefa czasowa `Europe/Warsaw`. Domena `*.vercel.app`.

## Users

Kilku dorosłych, swobodnie obsługujących iPhone'a. Każdy ma własne konto i własne leki; nikt nie prowadzi leków za inną osobę. Konta zakłada ręcznie administrator w panelu Supabase, bez publicznej rejestracji.

Typowa sytuacja: rano lub przy posiłku, z telefonem w jednej ręce, szybkie odhaczenie leków z danej pory dnia. Rzadziej: dodanie leku, zmiana dawkowania, uzupełnienie zapasu po zakupie.

## Product Purpose

Prywatna checklista leków przyjmowanych codziennie, z dawkowaniem w okresach, automatycznym śledzeniem zapasu i przypomnieniami.

**Najważniejsza korzyść: nie zapomnieć dawki.** Sercem aplikacji jest ekran „Dziś” (szybka checklista według pór dnia) i przypomnienia o nieodhaczonych lekach. Prognoza zapasu i okresy dawkowania wspierają ten cel, ale są drugorzędne.

Sukces: użytkownik codziennie odhacza leki w kilka sekund, nie pomija dawek i nie zostaje bez leku.

## Positioning

Narzędzie szyte na miarę konkretnego sposobu brania leków:

- **dawka złożona** – jedna pozycja na liście (np. 30 mg) składana z kilku opakowań o różnej mocy (1×20 mg + 1×10 mg), każde z własnym stanem;
- **okresy dawkowania** – zaplanowane zmiany dawki („od 16-go 20 mg”) i szybkie „od tego dnia nowe dawkowanie”;
- **zapas zmniejsza się sam** po odhaczeniu, a prognoza „starczy do” symuluje dzień po dniu z uwzględnieniem przyszłych okresów;
- pory dnia **bez godzin** (godzina tylko przy leku, który jej wymaga).

## Operating Context

- Ekrany: Dziś · Leki · Zapasy (dolny pasek), Ustawienia (⚙ w nagłówku). Szczegóły w docs/PROJEKT.md §4.
- Odhaczać można dziś i wczoraj; starsze dni tylko do podglądu (kalendarz: wszystko / część / nic).
- Nieodhaczone leki z poprzedniego dnia są wyliczane jako pominięte.
- Powiadomienia: nieodhaczone z pory (domyślnie 12:00 / 17:00 / 23:00), leki z konkretną godziną, jednorazowy alert niskiego zapasu (sprawdzany o 9:00, próg domyślnie 7 dni).
- Powiadomienia to zwykłe powiadomienia iOS, zgodne z trybem skupienia i „Nie przeszkadzać”.

## Capabilities and Constraints

- Wymaga internetu; brak trybu offline.
- Logowanie nazwą użytkownika i hasłem (`jan` → `jan@leki.local` w Supabase Auth).
- Formy: tabletki/kapsułki (szt., dozwolone połówki i ćwiartki), krople/syropy (ml lub krople).
- Opis leku: jedno pole tekstowe.
- Kolejność leków w porze: tryb edycji z przeciąganiem kafelków.
- Motyw jasny/ciemny automatycznie według systemu.
- Język interfejsu: polski.
- **Poza zakresem:** leki doraźne, suplementy, dane recept, eksport, kolory leków, offline, desktop, publiczna rejestracja.
- Pełny model danych i logika domenowa: docs/PROJEKT.md §5–7.

## Evidence on Hand

- docs/PROJEKT.md – specyfikacja z decyzjami z ankiety (2026-11-11), makieta tekstowa ekranu „Dziś”, model danych, plan faz.
- Brak logo, nazwy marki poza roboczą „Leki”, brak zrzutów ekranu i realnych danych. Nie wymyślać ich.

## Product Principles

1. **Odhaczenie w sekundach.** Ekran „Dziś” musi pozwolić odhaczyć porę jednym spojrzeniem i jednym dotknięciem; wszystko inne jest wtórne.
2. **Aplikacja liczy, człowiek nie.** Sumy dawek, stany opakowań i daty „starczy do” są wyliczane i pokazywane wprost.
3. **Pomyłka jest odwracalna.** Odznaczenie zwraca stan, wczoraj można poprawić, zmiana dawkowania zachowuje historię.
4. **Bez szumu.** Tylko leki cykliczne, tylko potrzebne powiadomienia, jednorazowe alerty zamiast powtarzanych.
5. **Prywatność domyślnie.** Dane każdego użytkownika są oddzielone (RLS); brak rejestracji, udostępniania i eksportu.

## Accessibility & Inclusion

Brak szczególnych potrzeb ponad standard: WCAG AA, poprawne zachowanie przy powiększonym tekście w iOS, przeciąganie z alternatywą dostępną dla czytników ekranu.
