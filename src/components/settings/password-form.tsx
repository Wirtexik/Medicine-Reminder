"use client";

import { useActionState, useEffect, useRef } from "react";
import { TextField } from "@/components/ui/text-field";
import { changePassword, type PasswordState } from "@/lib/auth/actions";

const initial: PasswordState = { error: null, ok: false };

export function PasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(changePassword, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="mt-4 space-y-3" noValidate>
      {/* Dla menedżera haseł: do którego konta należy nowe hasło. */}
      <input type="hidden" name="email" value={email} autoComplete="username" readOnly />
      <TextField label="Obecne hasło" name="current" type="password" autoComplete="current-password" required />
      <TextField label="Nowe hasło" name="next" type="password" autoComplete="new-password" minLength={8} required />
      <TextField label="Powtórz nowe hasło" name="repeat" type="password" autoComplete="new-password" required />

      <p
        role="status"
        className={["min-h-[1.3em] px-1 text-meta font-semibold", state.error ? "text-warn" : "text-ok"].join(" ")}
      >
        {state.error ?? (state.ok ? "Hasło zostało zmienione." : "")}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center rounded-full border-[1.5px] border-[color-mix(in_srgb,var(--text)_24%,transparent)] text-meta font-semibold text-text disabled:opacity-60"
      >
        {pending ? "Zapisywanie…" : "Zmień hasło"}
      </button>
    </form>
  );
}
