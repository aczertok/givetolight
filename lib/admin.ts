import { redirect } from "next/navigation";
import { currentUser, isAdmin, supabaseServer } from "@/lib/supabase/server";

/** Every admin page and action starts here. Row-level security enforces the same rule in the database. */
export async function requireAdmin() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/admin");
  if (!(await isAdmin())) redirect("/admin/not-allowed");
  return { user, sb: await supabaseServer() };
}

export const RESERVED = new Set(["admin", "ambassador", "login", "auth", "api", "thank-you", "privacy", "terms", "about"]);

export type Gift = {
  id: string;
  campaign_id: string;
  ambassador_id: string | null;
  team_id: string | null;
  ambassador_name: string | null;
  team_name: string | null;
  donor_name: string;
  donor_email: string | null;
  donor_phone: string | null;
  anonymous: boolean;
  dedication: string | null;
  message: string | null;
  amount: number;
  fee_covered: number;
  method: string | null;
  method_detail: string | null;
  provider: string;
  plan: string | null;
  status: string;
  created_at: string;
};

export async function allRows<T>(build: (a: number, b: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let a = 0; ; a += 1000) {
    const { data, error } = await build(a, a + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export const METHOD_LABEL: Record<string, string> = { card: "Card", ach: "Bank (ACH)", daf: "DAF", check: "Check", cash: "Cash", zelle: "Zelle", wire: "Wire", other: "Other" };
