import { requireAdmin, allRows } from "@/lib/admin";
import { normPhone, SITE_URL } from "@/lib/format";
import Analytics, { type AGift } from "@/components/Analytics";

export const metadata = { title: "Analytics" };

type Row = { campaign_id: string; donor_name: string; donor_email: string | null; donor_phone: string | null; amount: number; created_at: string; ambassador_id: string | null; ambassador_name: string | null; team_id: string | null; team_name: string | null; method: string | null; provider: string };

export default async function AnalyticsPage() {
  const { sb } = await requireAdmin();
  const { data: campaigns } = await sb.from("campaigns").select("id, name, slug, kind, year, status, goal, match_multiplier");
  const rows = await allRows<Row>((a, b) =>
    sb.from("donations").select("campaign_id, donor_name, donor_email, donor_phone, amount, created_at, ambassador_id, ambassador_name, team_id, team_name, method, provider")
      .eq("status", "succeeded").order("created_at").range(a, b));
  const { data: ambs } = await sb.from("ambassadors").select("id, name, phone, email, created_at").order("created_at");
  const { data: teams } = await sb.from("teams").select("id, name");
  const ambName = new Map((ambs || []).map((a) => [a.id, a.name]));
  const teamName = new Map((teams || []).map((t) => [t.id, t.name]));
  const gifts: AGift[] = rows.map((r) => [
    r.campaign_id, r.donor_name || "Anonymous", (r.donor_email || "").toLowerCase(), normPhone(r.donor_phone), Number(r.amount), r.created_at.slice(0, 10),
    (r.ambassador_id && ambName.get(r.ambassador_id)) || r.ambassador_name || "", (r.team_id && teamName.get(r.team_id)) || r.team_name || "", r.method || "", r.provider,
  ]);
  return (
    <Analytics
      campaigns={(campaigns || []).map((c) => ({ id: c.id, name: c.name, slug: c.slug, kind: c.kind, year: c.year, status: c.status, goal: c.goal ? Number(c.goal) : null, match: Number(c.match_multiplier) || 1 }))}
      gifts={gifts}
      ambassadors={(ambs || []).map((a) => ({ name: a.name, phone: normPhone(a.phone), email: a.email || "" }))}
      siteUrl={SITE_URL}
    />
  );
}
