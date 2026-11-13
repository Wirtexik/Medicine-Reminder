"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/text-field";
import { signIn, type SignInState } from "@/lib/auth/actions";
import { primaryButton } from "@/components/ui/buttons";

const initial: SignInState = { error: null, username: "" };

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, initial);
  const invalid = state.error ? true : undefined;

  return (
    <form action={action} className="mt-8 space-y-4" noValidate>
      <TextField
        label="Nazwa użytkownika"
        name="username"
        defaultValue={state.username}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="next"
        required
        aria-invalid={invalid}
        aria-describedby={state.error ? "login-error" : undefined}
      />
      <TextField
        label="Hasło"
        name="password"
        type="password"
        autoComplete="current-password"
        enterKeyHint="go"
        required
        aria-invalid={invalid}
        aria-describedby={state.error ? "login-error" : undefined}
      />

      <p id="login-error" role="alert" className="min-h-[1.3em] px-1 text-meta font-semibold text-warn">
        {state.error}
      </p>

      <button
        type="submit"
        disabled={pending}
        className={primaryButton}
      >
        {pending ? "Logowanie…" : "Zaloguj się"}
      </button>
    </form>
  );
}
