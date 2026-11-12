import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { signOut } from "@/lib/auth/actions";
import { emailToUsername } from "@/lib/auth/username";
import { createClient } from "@/lib/supabase/server";
import { PasswordForm } from "./password-form";

const card = "rounded-[var(--radius-card)] bg-card px-5 py-5 shadow-[var(--shadow)]";

export async function AccountSection() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email;
  if (!email) redirect("/logowanie");

  return (
    <>
      <section className={`mt-6 ${card}`}>
        <h2 className="text-body font-bold">Konto</h2>
        <p className="mt-1 text-meta text-text-2">
          Zalogowano jako <span className="font-semibold text-text">{emailToUsername(email)}</span>
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="mt-4 flex h-12 items-center gap-2 rounded-full border-[1.5px] border-line px-5 text-meta font-semibold"
          >
            <LogOut aria-hidden className="size-4" />
            Wyloguj się
          </button>
        </form>
      </section>

      <section className={`mt-4 ${card}`}>
        <h2 className="text-body font-bold">Zmiana hasła</h2>
        <PasswordForm email={email} />
      </section>
    </>
  );
}

export function AccountSectionSkeleton() {
  return (
    <div aria-hidden className="mt-6 space-y-4">
      <div className="h-36 rounded-[var(--radius-card)] bg-card-muted" />
      <div className="h-72 rounded-[var(--radius-card)] bg-card-muted" />
    </div>
  );
}
