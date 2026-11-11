import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Keeps the sign-in session fresh. Only runs where a session matters.
const SESSION_PATHS = /^\/(ambassador|admin|login|auth|account|go)(\/|$)|^\/$/;

export async function middleware(req: NextRequest) {
  // Web addresses work in any capitals: /TEST2027 → /test2027
  const path = req.nextUrl.pathname;
  if (path !== path.toLowerCase() && !path.startsWith("/api/")) {
    const u = req.nextUrl.clone();
    u.pathname = path.toLowerCase();
    return NextResponse.redirect(u, 308);
  }
  let res = NextResponse.next({ request: req });
  if (!SESSION_PATHS.test(path)) return res;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return res;
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  await sb.auth.getUser();
  return res;
}

export const config = { matcher: ["/((?!_next/|favicon|.*\\.[a-z0-9]+$).*)"] };
