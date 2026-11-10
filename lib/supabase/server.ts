import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabaseConfigured = () => Boolean(URL && ANON);

/** Acts as the signed-in visitor (or anonymous). Row-level security applies. */
export async function supabaseServer(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // called from a Server Component: the middleware refreshes the session instead
        }
      },
    },
  });
}

/** Server-only. Bypasses row-level security: use only after checking who is asking. */
export function supabaseAdmin(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !key) throw new Error("Supabase service key is not configured");
  return createClient(URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function currentUser() {
  if (!supabaseConfigured()) return null;
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}

/** Emails listed in the ADMIN_EMAILS setting (comma-separated) become staff the first time they log in. */
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "")
  .split(/[,\s]+/)
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function isAdmin(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  const sb = await supabaseServer();
  const { data } = await sb.rpc("is_admin");
  if (data === true) return true;
  const email = (user.email || "").toLowerCase();
  if (email && user.email_confirmed_at && ADMIN_EMAILS.includes(email)) {
    const { error } = await supabaseAdmin().from("admins").upsert({ user_id: user.id }, { onConflict: "user_id", ignoreDuplicates: true });
    return !error;
  }
  return false;
}
