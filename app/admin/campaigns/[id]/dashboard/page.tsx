import { notFound } from "next/navigation";
import { requireAdmin, allRows } from "@/lib/admin";
import { normPhone, SITE_URL } from "@/lib/format";
import CampaignDashboard, { type DGift, type DPrev } from "@/components/CampaignDashboard";

export const metadata = { title: "Campaign dashboard" };

type Row = { id: string; created_at: string; donor_name: string; donor_email: string | null; donor_phone: string | null; amount: number; method: string | null; ambassador_id: string | null; ambassador_name: string | null; team_id: string | null; team_name: string | null; plan: string | null; status: string; anonymous: boolean; dedication: string | null };

export default async function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { sb } = await requireAdmin();
  const { data: c } = await sb.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const { data: all } = await sb.from("campaigns").select("id, name, kind, year, created_at").eq("kind", c.kind).neq("id", c.id);
  const prev = (all || []).filter((x) => (x.year || 0) < (c.year || 9999) || ((x.year || 0) === (c.year || 0) && x.created_at < c.created_at))
    .sort((a, b) => (b.year || 0) - (a.year || 0))[0] || null;
  const cols = "id, created_at, donor_name, donor_email, donor_phone, amount, method, ambassador_id, ambassador_name, team_id, team_name, plan, status, anonymous, dedication";
  const rows = await allRows<Row>((a, b) => sb.from("donations").select(cols).eq("campaign_id", c.id).in("status", ["succeeded", "pending"]).order("created_at").range(a, b));
  const prevRows = prev ? await allRows<Row>((a, b) => sb.from("donations").select(cols).eq("campaign_id", prev.id).eq("status", "succeeded").order("created_at").range(a, b)) : [];
  const { data: ambs } = await sb.from("ambassadors").select("id, name, slug, goal, phone, email, status, team_id, created_at").eq("campaign_id", c.id);
  const { data: teams } = await sb.from("teams").select("id, name, slug, goal").eq("campaign_id", c.id);
  const starts = await allRows<{ created_at: string; donor_name: string; donor_email: string; donor_phone: string | null; amount: number; ambassador_id: string | null; method: string; completed: boolean }>((a, b) =>
    sb.from("checkout_starts").select("created_at, donor_name, donor_email, donor_phone, amount, ambassador_id, method, completed").eq("campaign_id", c.id).order("created_at", { ascending: false }).range(a, b));
  const ambName = new Map((ambs || []).map((a) => [a.id, a.name]));
  const teamName = new Map((teams || []).map((t) => [t.id, t.name]));
  const gifts: DGift[] = rows.map((r) => [r.id, r.created_at, r.donor_name || "", (r.donor_email || "").toLowerCase(), normPhone(r.donor_phone), Number(r.amount), r.method || "", r.ambassador_id || "", (r.ambassador_id && ambName.get(r.ambassador_id)) || r.ambassador_name || "", r.team_id || "", (r.team_id && teamName.get(r.team_id)) || r.team_name || "", r.plan || "", r.status, r.anonymous, r.dedication || ""]);
  const prevGifts: DPrev[] = prevRows.map((r) => [r.created_at, r.donor_name || "", (r.donor_email || "").toLowerCase(), normPhone(r.donor_phone), Number(r.amount), r.ambassador_name || ""]);
  return (
    <CampaignDashboard
      campaign={{ id: c.id, name: c.name, slug: c.slug, kind: c.kind, year: c.year, status: c.status, goal: c.goal ? Number(c.goal) : null, match: Number(c.match_multiplier) || 1, matchCap: c.match_cap == null ? null : Number(c.match_cap), endsAt: c.ends_at }}
      prev={prev ? { id: prev.id, name: prev.name } : null}
      gifts={gifts}
      prevGifts={prevGifts}
      ambassadors={(ambs || []).map((a) => ({ id: a.id, name: a.name, slug: a.slug, goal: a.goal ? Number(a.goal) : null, phone: normPhone(a.phone), email: a.email || "", status: a.status, teamId: a.team_id || "", created: a.created_at }))}
      teams={(teams || []).map((t) => ({ id: t.id, name: t.name, slug: t.slug, goal: t.goal ? Number(t.goal) : null }))}
      starts={starts.map((s) => ({ ts: s.created_at, name: s.donor_name || "", email: s.donor_email || "", phone: normPhone(s.donor_phone), amount: Number(s.amount), ambassadorId: s.ambassador_id || "", method: s.method, completed: s.completed }))}
      siteUrl={SITE_URL}
    />
  );
}
