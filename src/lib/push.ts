import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./data/database.types";

/*
  Web Push w przeglądarce: service worker (public/sw.js), zgoda, subskrypcja i jej zapis
  w push_subscriptions. Wysyła Edge Function `notify` (supabase/functions/notify).
*/

type Client = SupabaseClient<Database>;

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

/** Wybór użytkownika na tym urządzeniu; bez niego wygasła subskrypcja nie jest odnawiana. */
const FLAG = "leki-push";

export type PushState =
  | "misconfigured" // brak klucza VAPID w konfiguracji
  | "install" // iPhone poza PWA: najpierw „Do ekranu początkowego”
  | "unsupported"
  | "denied"
  | "off"
  | "on";

export class PushPermissionError extends Error {
  constructor(public readonly permission: NotificationPermission) {
    super(`Notification permission: ${permission}`);
  }
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function supported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
}

export async function readPushState(): Promise<PushState> {
  if (!VAPID_PUBLIC_KEY) return "misconfigured";
  if (!supported()) return isIos() && !isStandalone() ? "install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "off";
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a || a.byteLength !== b.length) return false;
  const x = new Uint8Array(a);
  return x.every((v, i) => v === b[i]);
}

/** Bieżąca subskrypcja z naszym kluczem VAPID; po zmianie klucza stara jest wymieniana. */
async function subscribe(reg: ServiceWorkerRegistration): Promise<PushSubscription> {
  const key = keyBytes(VAPID_PUBLIC_KEY);
  const existing = await reg.pushManager.getSubscription();
  if (existing && sameKey(existing.options.applicationServerKey, key)) return existing;
  if (existing) await existing.unsubscribe();
  return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
}

async function save(s: Client, sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("Niepełna subskrypcja push");
  const { error } = await s.rpc("register_push_subscription", {
    p_endpoint: json.endpoint,
    p_p256dh: json.keys.p256dh,
    p_auth: json.keys.auth,
  });
  if (error) throw error;
}

/** Wywołać bezpośrednio w obsłudze kliknięcia: iOS pyta o zgodę tylko po geście użytkownika. */
export async function enablePush(s: Client): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new PushPermissionError(permission);
  await registerServiceWorker();
  const reg = await navigator.serviceWorker.ready;
  await save(s, await subscribe(reg));
  localStorage.setItem(FLAG, "on");
}

export async function disablePush(s: Client): Promise<void> {
  localStorage.setItem(FLAG, "off");
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  const { error } = await s.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  if (error) throw error;
  await sub.unsubscribe();
}

/**
 * Przy starcie aplikacji: rejestruje service worker, a jeśli powiadomienia są włączone,
 * odnawia subskrypcję (mogła wygasnąć) i zapisuje ją dla zalogowanego użytkownika.
 */
export async function syncPush(s: Client): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !supported()) return;
  await registerServiceWorker();
  if (localStorage.getItem(FLAG) !== "on" || Notification.permission !== "granted") return;
  const reg = await navigator.serviceWorker.ready;
  await save(s, await subscribe(reg));
}
