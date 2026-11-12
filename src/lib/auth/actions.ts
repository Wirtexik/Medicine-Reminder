"use server";

import type { AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "../supabase/server";
import { usernameToEmail } from "./username";

export interface SignInState {
  error: string | null;
  username: string;
}

export interface PasswordState {
  error: string | null;
  ok: boolean;
}

function message(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Nieprawidłowa nazwa użytkownika lub hasło.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Zbyt wiele prób. Odczekaj chwilę i spróbuj ponownie.";
    case "weak_password":
      return "Hasło jest za słabe. Użyj dłuższego hasła.";
    case "same_password":
      return "Nowe hasło musi się różnić od obecnego.";
    case "user_banned":
      return "To konto jest zablokowane.";
  }
  if (error.status === 0 || error.name === "AuthRetryableFetchError") {
    return "Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.";
  }
  return "Coś poszło nie tak. Spróbuj ponownie.";
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Wpisz nazwę użytkownika i hasło.", username };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
  if (error) return { error: message(error), username };

  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/logowanie");
}

export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const repeat = String(formData.get("repeat") ?? "");

  if (!current || !next) return { error: "Wypełnij wszystkie pola.", ok: false };
  if (next.length < 8) return { error: "Nowe hasło musi mieć co najmniej 8 znaków.", ok: false };
  if (next !== repeat) return { error: "Nowe hasła nie są takie same.", ok: false };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email;
  if (!email) redirect("/logowanie");

  // Potwierdzenie obecnego hasła, zanim pozwolimy je zmienić.
  const check = await supabase.auth.signInWithPassword({ email, password: current });
  if (check.error) {
    return {
      error: check.error.code === "invalid_credentials" ? "Obecne hasło jest nieprawidłowe." : message(check.error),
      ok: false,
    };
  }

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: message(error), ok: false };
  return { error: null, ok: true };
}
