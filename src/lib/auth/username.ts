// Logowanie nazwą użytkownika: Supabase Auth wymaga e-maila, więc „jan” → „jan@leki.local”.
const DOMAIN = "leki.local";

export function usernameToEmail(username: string): string {
  const u = username.trim().toLowerCase();
  return u.includes("@") ? u : `${u}@${DOMAIN}`;
}

export function emailToUsername(email: string | null | undefined): string {
  if (!email) return "";
  return email.endsWith(`@${DOMAIN}`) ? email.slice(0, -DOMAIN.length - 1) : email;
}
