import type { SupabaseClient } from "@supabase/supabase-js";
import { allRows } from "@/lib/admin";
import { normPhone } from "@/lib/format";
import type { CG } from "@/lib/compare";

type Row = { donor_name: string; donor_email: string | null; donor_phone: string | null; amount: number; created_at: string; ambassador_id: string | null; ambassador_name: string | null; team_id: string | null; team_name: string | null };

/** Succeeded gifts of one campaign, in the compact shape the compare pages use. */
export async function loadCompareGifts(sb: SupabaseClient, campaignId: string): Promise<CG[]> {
  if (!campaignId) return [];
  const rows = await allRows<Row>((a, b) => sb.from("donations").select("donor_name, donor_email, donor_phone, amount, created_at, ambassador_id, ambassador_name, team_id, team_name").eq("campaign_id", campaignId).eq("status", "succeeded").order("created_at").range(a, b));
  const { data: ambs } = await sb.from("ambassadors").select("id, name").eq("campaign_id", campaignId);
  const { data: teams } = await sb.from("teams").select("id, name").eq("campaign_id", campaignId);
  const an = new Map((ambs || []).map((a) => [a.id, a.name])), tn = new Map((teams || []).map((t) => [t.id, t.name]));
  return rows.map((r) => [r.donor_name || "Anonymous", (r.donor_email || "").toLowerCase(), normPhone(r.donor_phone), Number(r.amount), r.created_at.slice(0, 10), (r.ambassador_id && an.get(r.ambassador_id)) || r.ambassador_name || "", (r.team_id && tn.get(r.team_id)) || r.team_name || ""]);
}

export type CampaignLite = { id: string; name: string; slug: string; kind: string; year: number | null; status: string; created_at: string };

/** Sensible defaults: newest campaign vs. the previous one of the same kind. */
export function pickPair(list: CampaignLite[], prev?: string, next?: string) {
  const sorted = [...list].sort((a, b) => (a.year || 0) - (b.year || 0) || a.created_at.localeCompare(b.created_at));
  const n = list.find((c) => c.id === next) || [...sorted].reverse().find((c) => c.status === "live") || sorted[sorted.length - 1];
  const before = n ? sorted.slice(0, sorted.indexOf(n)) : [];
  const p = list.find((c) => c.id === prev) || [...before].reverse().find((c) => c.kind === n?.kind) || before[before.length - 1];
  return { prev: p, next: n, sorted };
}
