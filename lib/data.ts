import { supabaseServer, supabaseConfigured } from "@/lib/supabase/server";

export type Campaign = {
  id: string;
  slug: string;
  name: string;
  kind: string;
  year: number | null;
  tagline: string | null;
  story: string | null;
  cover_url: string | null;
  goal: number | null;
  match_multiplier: number;
  match_cap: number | null;
  match_note: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: "draft" | "live" | "ended";
  show_on_home: boolean;
  ambassador_approval: boolean;
  preset_amounts: number[];
};
export type Team = { id: string; campaign_id: string; slug: string; name: string; goal: number | null; blurb: string | null; photo_url: string | null };
export type Ambassador = { id: string; campaign_id: string; team_id: string | null; slug: string; name: string; goal: number | null; story: string | null; photo_url: string | null };
export type PublicDonation = {
  id: string;
  campaign_id: string;
  ambassador_id: string | null;
  team_id: string | null;
  display_name: string;
  amount: number;
  dedication: string | null;
  message: string | null;
  plan: string | null;
  created_at: string;
};

export type Ranked<T> = T & { raised: number; donors: number };

export type CampaignPage = {
  campaign: Campaign;
  raised: number; // donor dollars
  total: number; // with match
  matched: number;
  factor: number; // multiply donor dollars by this to show "with match"
  donorCount: number;
  teams: Ranked<Team>[];
  ambassadors: Ranked<Ambassador & { teamName: string | null }>[];
  donations: PublicDonation[];
};

/** Supabase returns at most 1000 rows per request: page through everything. */
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(from, from + 999);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const num = (v: unknown) => (v == null ? null : Number(v));
function normCampaign(c: Record<string, unknown>): Campaign {
  return {
    ...(c as unknown as Campaign),
    goal: num(c.goal),
    match_multiplier: Number(c.match_multiplier || 1),
    match_cap: num(c.match_cap),
    preset_amounts: (c.preset_amounts as number[]) || [36, 180, 360, 1000, 1800],
  };
}

export function matchMath(campaign: Pick<Campaign, "match_multiplier" | "match_cap">, raised: number) {
  const m = campaign.match_multiplier || 1;
  if (m <= 1 || raised <= 0) return { matched: 0, total: raised, factor: m > 1 ? m : 1 };
  const matched = Math.min(raised * (m - 1), campaign.match_cap ?? Infinity);
  return { matched, total: raised + matched, factor: (raised + matched) / raised };
}

export async function listCampaigns(): Promise<(Campaign & { raised: number; total: number; donors: number })[]> {
  if (!supabaseConfigured()) return [];
  const sb = await supabaseServer();
  const { data } = await sb.from("campaigns_public").select("*").eq("show_on_home", true).order("status").order("ends_at", { ascending: false, nullsFirst: true });
  const list = (data || []).map(normCampaign);
  return Promise.all(
    list.map(async (c) => {
      const { data: t } = await sb.rpc("campaign_totals", { p_campaign: c.id });
      const row = Array.isArray(t) ? t[0] : t;
      const raised = Number(row?.raised || 0);
      return { ...c, raised, total: raised + Number(row?.matched || 0), donors: Number(row?.donors || 0) };
    })
  );
}

export async function getCampaign(slug: string): Promise<Campaign | null> {
  if (!supabaseConfigured()) return null;
  const sb = await supabaseServer();
  const key = slug.toLowerCase();
  const { data } = await sb.from("campaigns_public").select("*").eq("slug", key).maybeSingle();
  if (data) return normCampaign(data);
  // Staff can preview drafts (row-level security only returns them to admins).
  const { data: draft } = await sb.from("campaigns").select("*").eq("slug", key).maybeSingle();
  return draft ? normCampaign(draft) : null;
}

export async function getCampaignPage(slug: string): Promise<CampaignPage | null> {
  const campaign = await getCampaign(slug);
  if (!campaign) return null;
  const sb = await supabaseServer();
  const [teamsRes, ambs, donations] = await Promise.all([
    sb.from("teams_public").select("*").eq("campaign_id", campaign.id).order("name"),
    fetchAll<Ambassador>((a, b) => sb.from("ambassadors_public").select("*").eq("campaign_id", campaign.id).order("created_at").range(a, b)),
    fetchAll<PublicDonation>((a, b) =>
      sb.from("donations_public").select("*").eq("campaign_id", campaign.id).order("created_at", { ascending: false }).range(a, b)
    ),
  ]);
  const teams = (teamsRes.data || []) as Team[];
  const ds = donations.map((d) => ({ ...d, amount: Number(d.amount) }));
  const raised = ds.reduce((s, d) => s + d.amount, 0);
  const { matched, total, factor } = matchMath(campaign, raised);

  const ambTeam = new Map(ambs.map((a) => [a.id, a.team_id]));
  const byAmb = new Map<string, { raised: number; donors: number }>();
  const byTeam = new Map<string, { raised: number; donors: number }>();
  for (const d of ds) {
    if (d.ambassador_id) {
      const e = byAmb.get(d.ambassador_id) || { raised: 0, donors: 0 };
      e.raised += d.amount;
      e.donors++;
      byAmb.set(d.ambassador_id, e);
    }
    const t = d.team_id || (d.ambassador_id ? ambTeam.get(d.ambassador_id) : null);
    if (t) {
      const e = byTeam.get(t) || { raised: 0, donors: 0 };
      e.raised += d.amount;
      e.donors++;
      byTeam.set(t, e);
    }
  }
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  return {
    campaign,
    raised,
    total,
    matched,
    factor,
    donorCount: ds.length,
    donations: ds,
    teams: teams
      .map((t) => ({ ...t, goal: num(t.goal), ...(byTeam.get(t.id) || { raised: 0, donors: 0 }) }))
      .sort((a, b) => b.raised - a.raised),
    ambassadors: ambs
      .map((a) => ({ ...a, goal: num(a.goal), teamName: a.team_id ? teamName.get(a.team_id) || null : null, ...(byAmb.get(a.id) || { raised: 0, donors: 0 }) }))
      .sort((a, b) => b.raised - a.raised || a.name.localeCompare(b.name)),
  };
}

export { timeLeft } from "@/lib/format";
