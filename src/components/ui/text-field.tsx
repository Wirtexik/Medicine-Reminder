"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "className"> & {
  label: string;
};

/** Pole tekstowe z etykietą nad nim. Dla type="password" przycisk „pokaż hasło”. */
export function TextField({ label, type = "text", ...input }: Props) {
  const id = useId();
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="block px-1 text-meta font-semibold text-text-2">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={isPassword && visible ? "text" : type}
          className={[
            "h-[3.25rem] w-full rounded-[var(--radius-field)] bg-card-muted px-4 text-body text-text",
            "border-[1.5px] border-transparent placeholder:text-text-3 focus:border-line",
            "aria-invalid:border-warn",
            isPassword ? "pr-14" : "",
          ].join(" ")}
          {...input}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ukryj hasło" : "Pokaż hasło"}
            aria-pressed={visible}
            className="absolute inset-y-0 right-1 my-auto flex size-11 items-center justify-center rounded-full text-text-2"
          >
            {visible ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
          </button>
        )}
      </div>
    </div>
  );
}
