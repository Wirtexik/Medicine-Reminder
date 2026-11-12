"use client";

import { Check, ChevronDown, ChevronLeft, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import { formatQuantity } from "@/lib/domain/format";
import { fieldClass } from "./text-field";

/* Wspólne elementy formularzy ekranu „Leki”, w języku DESIGN.md. */

export const primaryButton =
  "flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-full bg-action px-5 text-body font-semibold text-on-action transition-transform duration-150 active:scale-[0.98] active:bg-action-press disabled:opacity-40";

export const outlineButton =
  "flex h-12 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--text)_24%,transparent)] px-5 text-meta font-semibold text-text transition-transform duration-150 active:scale-[0.98] disabled:opacity-40";

export const roundButton =
  "grid size-11 shrink-0 place-items-center rounded-full bg-card-muted text-text transition-transform duration-150 active:scale-90 disabled:opacity-40";

export const cardClass = "rounded-[var(--radius-card)] bg-card";

/** Pasek nad tytułem: powrót po lewej, opcjonalna akcja po prawej. */
export function BackBar({ href, label, children }: { href: string; label: string; children?: React.ReactNode }) {
  return (
    <div className="-mx-2 flex h-11 items-center justify-between">
      <Link href={href} className="flex h-11 min-w-0 items-center gap-1 rounded-full px-2 text-body font-medium">
        <ChevronLeft aria-hidden className="size-6 shrink-0" />
        <span className="truncate">{label}</span>
      </Link>
      {children}
    </div>
  );
}

export function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="px-1 text-body font-bold">
      {children}
    </h2>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block px-1 text-meta font-semibold text-text-2">
        {label}
      </label>
      <div className="relative mt-1.5">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldClass} appearance-none pr-12`}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute inset-y-0 right-4 my-auto size-5 text-text-2" />
      </div>
    </div>
  );
}

/** Przełącznik kilku opcji (radio). Wybrana opcja odwrócona (`text` / `ground`), jak wybrany dzień. */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex h-[3.25rem] gap-1 rounded-[var(--radius-field)] bg-card-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={[
            "flex-1 rounded-[calc(var(--radius-field)-0.25rem)] text-body",
            value === o.value ? "bg-text font-semibold text-ground" : "text-text-2",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Licznik ilości: − wartość +. */
export function Stepper({
  label,
  value,
  step,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  const set = (v: number) => onChange(Math.max(0, +v.toFixed(2)));
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <button type="button" aria-label={`${label}: mniej`} disabled={value <= 0} onClick={() => set(value - step)} className={roundButton}>
        <Minus aria-hidden className="size-5" />
      </button>
      <output aria-live="polite" className="min-w-[3.5rem] text-center text-body font-semibold whitespace-nowrap">
        {formatQuantity(value)}
        {" "}
        <span className="font-normal text-text-2">{unit}</span>
      </output>
      <button type="button" aria-label={`${label}: więcej`} onClick={() => set(value + step)} className={roundButton}>
        <Plus aria-hidden className="size-5" />
      </button>
    </div>
  );
}

/** Pole wyboru z etykietą (np. „Bez daty końca”). */
export function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 px-1 text-body">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center rounded-[0.45rem] border-[2px] border-text-2 peer-checked:border-text peer-checked:bg-text peer-focus-visible:outline-[2.5px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)] [&>svg]:invisible peer-checked:[&>svg]:visible"
      >
        <Check className="size-4 text-ground" strokeWidth={3} />
      </span>
      {label}
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  return (
    <p role="alert" className="min-h-[1.3em] px-1 text-meta font-semibold text-warn">
      {message ?? ""}
    </p>
  );
}
