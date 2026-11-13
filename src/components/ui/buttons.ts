/*
  Klasy przycisków w języku DESIGN.md (kapsuła, wciśnięcie 0.98, wyłączony 40%).
  Osobny moduł bez "use client": stałe są potrzebne także w komponentach serwerowych,
  a eksport z modułu klienckiego trafiłby tam jako referencja, nie tekst.
*/

const press = "transition-transform duration-150 active:scale-[0.98] disabled:opacity-40";

/** Główna akcja ekranu: pełna szerokość, `action` z `on-action`. */
export const primaryButton = `flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-action px-5 text-body font-semibold text-on-action active:bg-action-press ${press}`;

/** Ta sama akcja, ale szerokość według treści (pusty stan, „Spróbuj ponownie”). */
export const primaryPill = `inline-flex h-12 items-center justify-center gap-2 rounded-full bg-action px-6 text-body font-semibold text-on-action active:bg-action-press ${press}`;

const outline = "border-[1.5px] border-[color-mix(in_srgb,var(--text)_24%,transparent)] text-meta font-semibold text-text";

/** Akcja drugorzędna: obrys `text` w 24%, pełna szerokość. */
export const outlineButton = `flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 ${outline} ${press}`;

/** Akcja drugorzędna o szerokości treści (np. „Wyloguj się”). */
export const outlinePill = `inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 ${outline} ${press}`;

export const roundButton =
  "grid size-11 shrink-0 place-items-center rounded-full bg-card-muted text-text transition-transform duration-150 active:scale-90 disabled:opacity-40";

export const cardClass = "rounded-[var(--radius-card)] bg-card";
