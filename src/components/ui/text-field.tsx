"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "id" | "className"> & {
  label: string;
  /** Podpowiedź pod polem. */
  hint?: string;
  /** Komunikat błędu pod polem (zastępuje podpowiedź). */
  error?: string | null;
  /** Jednostka w polu po prawej, np. „mg”. */
  suffix?: string;
};

export const fieldClass = [
  "h-[3.25rem] w-full rounded-[var(--radius-field)] bg-card-muted px-4 text-body text-text",
  "border-[1.5px] border-transparent placeholder:text-text-3 focus:border-line",
  "aria-invalid:border-warn",
  // iOS wyśrodkowuje wartość pól daty i godziny; tu jak w pozostałych polach.
  "[&::-webkit-date-and-time-value]:text-left",
].join(" ");

/** Pole tekstowe z etykietą nad nim. Dla type="password" przycisk „pokaż hasło”. */
export function TextField({ label, hint, error, suffix, type = "text", ...input }: Props) {
  const id = useId();
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);
  const note = error || hint;

  return (
    <div>
      <label htmlFor={id} className="block px-1 text-meta font-semibold text-text-2">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={isPassword && visible ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={note ? `${id}-note` : undefined}
          className={[fieldClass, isPassword || suffix ? "pr-14" : ""].join(" ")}
          {...input}
        />
        {suffix && (
          <span aria-hidden className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-body text-text-2">
            {suffix}
          </span>
        )}
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
      {note && (
        <p id={`${id}-note`} className={["mt-1.5 px-1 text-meta", error ? "font-semibold text-warn" : "text-text-2"].join(" ")}>
          {note}
        </p>
      )}
    </div>
  );
}

type AreaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className"> & {
  label: string;
  hint?: string;
};

export function TextArea({ label, hint, ...area }: AreaProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block px-1 text-meta font-semibold text-text-2">
        {label}
      </label>
      <textarea
        id={id}
        rows={4}
        aria-describedby={hint ? `${id}-note` : undefined}
        className="mt-1.5 block w-full resize-none rounded-[var(--radius-field)] border-[1.5px] border-transparent bg-card-muted px-4 py-3 text-body text-text placeholder:text-text-3 focus:border-line"
        {...area}
      />
      {hint && (
        <p id={`${id}-note`} className="mt-1.5 px-1 text-meta text-text-2">
          {hint}
        </p>
      )}
    </div>
  );
}
