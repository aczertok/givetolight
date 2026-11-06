import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { demoClient } from "@/lib/demo/client";

/** Preview mode: sample data, no database. Never set DEMO_MODE on the live site. */
export const DEMO = process.env.DEMO_MODE === "1";
type Client = SupabaseClient;

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabaseConfigured = () => DEMO || Boolean(URL && ANON);

/** Acts as the signed-in visitor (or anonymous). Row-level security applies. */
export async function supabaseServer(): Promise<Client> {
  if (DEMO) return demoClient() as unknown as Client;
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
export function supabaseAdmin(): Client {
  if (DEMO) return demoClient() as unknown as Client;
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

export async function isAdmin(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  const sb = await supabaseServer();
  const { data } = await sb.rpc("is_admin");
  return data === true;
}
