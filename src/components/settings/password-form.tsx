"use client";

import { useActionState, useEffect, useRef } from "react";
import { outlineButton } from "@/components/ui/controls";
import { TextField } from "@/components/ui/text-field";
import { changePassword, type PasswordField, type PasswordState } from "@/lib/auth/actions";

const initial: PasswordState = { error: null, ok: false };
const ERROR_ID = "password-error";

export function PasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(changePassword, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  // Pole z błędem: oznaczone i powiązane z komunikatem, żeby VoiceOver wskazał, czego dotyczy.
  const invalid = (field: PasswordField) =>
    state.error && state.field === field ? { "aria-invalid": true as const, "aria-describedby": ERROR_ID } : {};

  return (
    <form ref={formRef} action={action} className="mt-4 space-y-3" noValidate>
      {/* Dla menedżera haseł: do którego konta należy nowe hasło. */}
      <input type="hidden" name="email" value={email} autoComplete="username" readOnly />
      <TextField label="Obecne hasło" name="current" type="password" autoComplete="current-password" required {...invalid("current")} />
      <TextField label="Nowe hasło" name="next" type="password" autoComplete="new-password" minLength={8} required {...invalid("next")} />
      <TextField label="Powtórz nowe hasło" name="repeat" type="password" autoComplete="new-password" required {...invalid("repeat")} />

      {/* Zawsze w drzewie dostępności (inaczej czytnik może przegapić zmianę); alert ogłasza od razu. */}
      <p
        id={ERROR_ID}
        role="alert"
        className={["min-h-[1.3em] px-1 text-meta font-semibold", state.error ? "text-warn" : "text-ok"].join(" ")}
      >
        {state.error ?? (state.ok ? "Hasło zostało zmienione." : "")}
      </p>

      <button type="submit" disabled={pending} className={outlineButton}>
        {pending ? "Zapisywanie…" : "Zmień hasło"}
      </button>
    </form>
  );
}
