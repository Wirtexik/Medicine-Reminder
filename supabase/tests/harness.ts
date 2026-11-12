/**
 * Baza do testów SQL: prawdziwy Postgres (PGlite, WASM) z migracjami z supabase/migrations.
 * Nie wymaga Dockera ani połączenia z projektem Supabase.
 *
 * Supabase dostarcza schemat `auth`, role i rozszerzenia pg_cron / pg_net / Vault;
 * tu są ich minimalne odpowiedniki. `auth.uid()` czyta `request.jwt.claim.sub`,
 * tak jak w Supabase, a użytkownik jest przełączany przez SET ROLE + ten claim.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";

const MIGRATIONS = join(import.meta.dirname, "..", "migrations");

const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;

  create schema extensions;
  grant usage on schema extensions to anon, authenticated, service_role;

  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create schema cron;
  create table cron.job (name text primary key, schedule text, command text);
  create function cron.schedule(p_name text, p_schedule text, p_command text) returns bigint language sql as $$
    insert into cron.job values (p_name, p_schedule, p_command)
      on conflict (name) do update set schedule = excluded.schedule, command = excluded.command;
    select 1::bigint;
  $$;

  create schema net;
  create function net.http_post(url text, headers jsonb, body jsonb, timeout_milliseconds int) returns bigint
    language sql as $$ select 1::bigint $$;

  create schema vault;
  create table vault.decrypted_secrets (name text primary key, decrypted_secret text);
`;

/** Rozszerzenia, których PGlite nie ma; ich odpowiedniki są w SUPABASE_STUBS. */
function adapt(sql: string): string {
  return sql.replace(/^create extension if not exists (pg_net|pg_cron)\b.*$/gim, "-- (test) $&");
}

export type Db = PGlite & { as: (userId: string | null) => Promise<void>; asAdmin: () => Promise<void> };

export async function createDb(): Promise<Db> {
  const pg = new PGlite({ extensions: { btree_gist } });
  await pg.exec(SUPABASE_STUBS);
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    try {
      await pg.exec(adapt(readFileSync(join(MIGRATIONS, file), "utf8")));
    } catch (e) {
      throw new Error(`Migracja ${file}: ${(e as Error).message}`);
    }
  }

  const db = pg as Db;
  /** Zalogowany użytkownik (rola authenticated) albo anonim (null). */
  db.as = async (userId) => {
    await pg.exec("reset role");
    await pg.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
    await pg.exec(userId ? "set role authenticated" : "set role anon");
  };
  /** Superużytkownik bez claimu (np. przygotowanie danych, odczyt z pominięciem RLS). */
  db.asAdmin = async () => {
    await pg.exec("reset role");
    await pg.query("select set_config('request.jwt.claim.sub', '', false)");
  };
  return db;
}

/** Nowe konto: wiersz w auth.users (trigger zakłada profil i pory dnia). */
export async function createUser(db: Db, id: string, email: string) {
  await db.asAdmin();
  await db.query("insert into auth.users (id, email) values ($1, $2)", [id, email]);
}

/** Kod błędu Postgresa i podpowiedź (hint) z odrzuconego zapytania. */
export async function pgError(promise: Promise<unknown>): Promise<{ code?: string; hint?: string; message: string }> {
  try {
    await promise;
  } catch (e) {
    const err = e as { code?: string; hint?: string; message: string };
    return { code: err.code, hint: err.hint, message: err.message };
  }
  throw new Error("Zapytanie miało się nie udać, a przeszło");
}
