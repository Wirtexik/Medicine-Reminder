"use client";

import { Check } from "lucide-react";

/**
 * Okrągły checkbox dawki. Pole dotyku 48px, widoczne kółko 30px.
 * Zaznaczenie wypełnia kółko kolorem akcji miękkim, sprężystym ruchem.
 */
export function DoseCheck({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="group -m-2 grid size-12 shrink-0 place-items-center rounded-full"
    >
      <span
        className={[
          "grid size-[1.9rem] place-items-center rounded-full border-[2.5px] transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-out-expo)] group-active:scale-90",
          checked ? "border-action bg-action" : "border-text-2 bg-transparent",
        ].join(" ")}
      >
        {checked && (
          <Check
            aria-hidden
            strokeWidth={3.25}
            className="size-[1.15rem] text-on-action [animation:check-pop_280ms_var(--ease-out-expo)]"
          />
        )}
      </span>
    </button>
  );
}
