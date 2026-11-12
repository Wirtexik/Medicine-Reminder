import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./lib/data/database.types";
import { SUPABASE_KEY, SUPABASE_URL } from "./lib/supabase/env";

const LOGIN_PATH = "/logowanie";

/*
  Odświeża sesję Supabase w ciasteczkach i przekierowuje niezalogowanych na /logowanie.
  To tylko optymistyczny filtr dla wygody; dane chroni RLS w bazie.
*/
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims weryfikuje JWT (i w razie potrzeby odświeża sesję). Nic nie wstawiać między
  // utworzeniem klienta a tym wywołaniem.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const { pathname } = request.nextUrl;
  const onLogin = pathname === LOGIN_PATH;

  if (!signedIn && !onLogin) return redirectKeepingCookies(request, response, LOGIN_PATH);
  if (signedIn && onLogin) return redirectKeepingCookies(request, response, "/");
  return response;
}

function redirectKeepingCookies(request: NextRequest, from: NextResponse, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  // Nagłówki anty-cache, które @supabase/ssr dokłada przy zapisie ciasteczek sesji.
  for (const key of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(key);
    if (value) redirect.headers.set(key, value);
  }
  return redirect;
}

export const config = {
  // Pomija zasoby statyczne, manifest PWA i ikony (iOS pobiera je bez sesji).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon|manifest.webmanifest|sw.js|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
