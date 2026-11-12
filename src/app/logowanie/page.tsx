import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Logowanie · Leki" };

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm px-5 pt-[max(4rem,calc(env(safe-area-inset-top)+3rem))] pb-10">
      <h1 className="font-rounded text-title font-bold tracking-[-0.02em]">Leki</h1>
      <p className="mt-2 max-w-[34ch] text-body text-text-2">Zaloguj się, żeby zobaczyć swoją listę leków.</p>
      <LoginForm />
      <p className="mt-8 max-w-[38ch] px-1 text-meta text-text-2">
        Nie masz konta albo nie pamiętasz hasła? Konta zakłada administrator aplikacji.
      </p>
    </main>
  );
}
