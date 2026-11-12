// Integracja Vercel–Supabase może nazwać klucz ANON_KEY albo PUBLISHABLE_KEY.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// `||`, nie `??`: pusta zmienna (np. ANON_KEY="") też przechodzi na drugą nazwę.
export const SUPABASE_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!;
