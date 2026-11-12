// Edge Function `notify` (docs/PLAN.md §8, PROJEKT.md §7).
// Wywołuje ją pg_cron co 15 min (public.invoke_notify) z nagłówkiem x-notify-secret.
// Co wysłać, liczy baza: public.notification_candidates(). Tu: deduplikacja, treść, web-push.
//
// Sekrety (supabase secrets set): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, NOTIFY_SECRET.
// SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY Supabase ustawia sam.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type Kind = "slot_missed" | "exact_time" | "low_stock";

interface Candidate {
  user_id: string;
  kind: Kind;
  ref_id: string;
  date: string;
  info: Record<string, unknown>;
}

interface Subscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface Message {
  title: string;
  body: string;
  url: string;
  tag: string;
}

const env = (name: string) => Deno.env.get(name) ?? "";

const NBSP = " ";

function formatNumber(n: number): string {
  return n.toLocaleString("pl-PL", { maximumFractionDigits: 2 });
}

function pluralLeki(n: number): string {
  if (n === 1) return "lek";
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? "leki" : "leków";
}

function pluralKrople(n: number): string {
  if (!Number.isInteger(n)) return "kropli";
  if (n === 1) return "kropla";
  const d = n % 10;
  const t = n % 100;
  return d >= 2 && d <= 4 && (t < 12 || t > 14) ? "krople" : "kropli";
}

/** Łączna dawka jak doseTotal() w src/lib/domain/format.ts: „30 mg”, „5 kropli”. */
function doseTotal(parts: { quantity: number; strength: number; unit: string }[]): string {
  const unit = parts[0]?.unit;
  if (!unit) return "";
  if (unit === "krople") {
    const n = parts.reduce((s, p) => s + Number(p.quantity), 0);
    return `${formatNumber(n)}${NBSP}${pluralKrople(n)}`;
  }
  if (!parts.every((p) => p.unit === unit)) return "";
  const total = parts.reduce((s, p) => s + Number(p.quantity) * Number(p.strength), 0);
  return `${formatNumber(total)}${NBSP}${unit}`;
}

/** „2026-11-18” → „18.11” */
function shortDate(key: string): string {
  const [, m, d] = key.split("-");
  return `${d}.${m}`;
}

function message(c: Candidate): Message {
  const tag = `${c.kind}:${c.ref_id}:${c.date}`;
  const i = c.info;
  switch (c.kind) {
    case "slot_missed": {
      const count = Number(i.count);
      const meds = (i.meds as string[]) ?? [];
      return {
        title: `Nie odhaczono: ${i.slot} (${count} ${pluralLeki(count)})`,
        body: meds.join(", "),
        url: "/",
        tag,
      };
    }
    case "exact_time": {
      const total = doseTotal((i.parts as { quantity: number; strength: number; unit: string }[]) ?? []);
      return {
        title: `${i.med}${total ? ` ${total}` : ""} – ${i.time}`,
        body: `Pora: ${i.slot}`,
        url: "/",
        tag,
      };
    }
    case "low_stock": {
      const daysLeft = Number(i.days_left);
      return {
        title: daysLeft <= 0 ? `${i.med}: zapas się skończył` : `${i.med} kończy się – starczy do ${shortDate(String(i.last_day))}`,
        body: "Dodaj opakowanie w Zapasach.",
        url: "/zapasy",
        tag,
      };
    }
  }
}

/** Jak długo serwer push ma próbować doręczyć (s). */
const TTL: Record<Kind, number> = { slot_missed: 6 * 3600, exact_time: 3 * 3600, low_stock: 24 * 3600 };

const keyOf = (c: Pick<Candidate, "kind" | "ref_id" | "date">) => `${c.kind}|${c.ref_id}|${c.date}`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const secret = env("NOTIFY_SECRET");
  if (!secret || req.headers.get("x-notify-secret") !== secret) return json({ error: "unauthorized" }, 401);

  const vapid = { publicKey: env("VAPID_PUBLIC_KEY"), privateKey: env("VAPID_PRIVATE_KEY"), subject: env("VAPID_SUBJECT") };
  if (!vapid.publicKey || !vapid.privateKey || !vapid.subject) return json({ error: "missing VAPID secrets" }, 500);

  const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: candidates, error: candErr } = await db.rpc("notification_candidates");
  if (candErr) return json({ error: candErr.message }, 500);
  const list = (candidates ?? []) as Candidate[];
  if (list.length === 0) return json({ candidates: 0, sent: 0 });

  // Zajęcie wpisów w notification_log przed wysyłką: przy dwóch równoległych wywołaniach
  // każdą pozycję wyśle tylko to, które ją wstawiło (UNIQUE kind, ref_id, date).
  const { data: claimedRows, error: claimErr } = await db
    .from("notification_log")
    .upsert(
      list.map((c) => ({ user_id: c.user_id, kind: c.kind, ref_id: c.ref_id, date: c.date })),
      { onConflict: "kind,ref_id,date", ignoreDuplicates: true },
    )
    .select("id, kind, ref_id, date");
  if (claimErr) return json({ error: claimErr.message }, 500);

  const byKey = new Map(list.map((c) => [keyOf(c), c]));
  const claimed = (claimedRows ?? []).map((r) => ({ logId: r.id as string, c: byKey.get(keyOf(r as Candidate))! }));
  if (claimed.length === 0) return json({ candidates: list.length, sent: 0 });

  const userIds = [...new Set(claimed.map(({ c }) => c.user_id))];
  const { data: subs, error: subErr } = await db
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (subErr) return json({ error: subErr.message }, 500);

  const subsByUser = new Map<string, Subscription[]>();
  for (const s of (subs ?? []) as Subscription[]) {
    subsByUser.set(s.user_id, [...(subsByUser.get(s.user_id) ?? []), s]);
  }

  const gone = new Set<string>();
  const undelivered: string[] = [];
  const lowStockSent: string[] = [];
  const failures: string[] = [];

  await Promise.all(
    claimed.map(async ({ logId, c }) => {
      const payload = JSON.stringify(message(c));
      let delivered = false;
      await Promise.all(
        (subsByUser.get(c.user_id) ?? []).map(async (s) => {
          try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
              vapidDetails: vapid,
              TTL: TTL[c.kind],
            });
            delivered = true;
          } catch (e) {
            const status = (e as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) gone.add(s.id);
            else failures.push(`${status ?? "?"} ${(e as Error).message}`);
          }
        }),
      );
      if (!delivered) undelivered.push(logId);
      else if (c.kind === "low_stock") lowStockSent.push(c.ref_id);
    }),
  );

  // Wygasłe subskrypcje znikają; niedoręczone pozycje wracają do kolejki (następne wywołanie).
  if (gone.size > 0) await db.from("push_subscriptions").delete().in("id", [...gone]);
  if (undelivered.length > 0) await db.from("notification_log").delete().in("id", undelivered);
  if (lowStockSent.length > 0) {
    await db.from("medications").update({ low_stock_notified_at: new Date().toISOString() }).in("id", lowStockSent);
  }

  return json({
    candidates: list.length,
    sent: claimed.length - undelivered.length,
    undelivered: undelivered.length,
    expiredSubscriptions: gone.size,
    failures,
  });
});
