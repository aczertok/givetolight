import { requireAdmin, allRows } from "@/lib/admin";
import { normPhone, SITE_URL } from "@/lib/format";
import Abandoned, { type ARow } from "@/components/Abandoned";

export const metadata = { title: "Abandoned donations" };
type S = { id: string; created_at: string; campaign_id: string; ambassador_id: string | null; team_id: string | null; donor_name: string | null; donor_email: string | null; donor_phone: string | null; amount: number; completed: boolean; recovery_sent_at: string | null };

export default async function Page() {
  const { sb } = await requireAdmin();
  const starts = await allRows<S>((a, b) => sb.from("checkout_starts").select("id, created_at, campaign_id, ambassador_id, team_id, donor_name, donor_email, donor_phone, amount, completed, recovery_sent_at").order("created_at", { ascending: false }).range(a, b));
  const { data: camps } = await sb.from("campaigns").select("id, name, slug");
  const { data: ambs } = await sb.from("ambassadors").select("id, name, slug");
  const { data: teams } = await sb.from("teams").select("id, name");
  const emails = [...new Set(starts.filter((s) => !s.completed && s.donor_email).map((s) => s.donor_email!.toLowerCase()))];
  // A later successful gift from the same email in the same campaign counts as rescued.
  const later = emails.length ? await allRows<{ donor_email: string; campaign_id: string; created_at: string; amount: number }>((a, b) => sb.from("donations").select("donor_email, campaign_id, created_at, amount").in("donor_email", emails.slice(0, 900)).eq("status", "succeeded").range(a, b)) : [];
  const cm = new Map((camps || []).map((c) => [c.id, c])), am = new Map((ambs || []).map((a) => [a.id, a])), tm = new Map((teams || []).map((t) => [t.id, t.name]));
  const rows: ARow[] = starts.map((s) => {
    const resc = !s.completed && later.find((d) => d.donor_email?.toLowerCase() === s.donor_email?.toLowerCase() && d.campaign_id === s.campaign_id && d.created_at >= s.created_at);
    const c = cm.get(s.campaign_id); const a = s.ambassador_id ? am.get(s.ambassador_id) : null;
    return { id: s.id, ts: s.created_at, name: s.donor_name || "", email: (s.donor_email || "").toLowerCase(), phone: normPhone(s.donor_phone), amount: Number(s.amount), campaignId: s.campaign_id, campaign: c?.name || "", link: c ? `${SITE_URL}/${c.slug}/donate${a ? `?a=${a.slug}` : ""}` : SITE_URL,
      layer: a?.name || (s.team_id && tm.get(s.team_id)) || "", state: s.completed ? "completed" : resc ? "rescued" : "abandoned", rescuedAmount: resc ? Number(resc.amount) : 0, recoverySent: s.recovery_sent_at || "" };
  });
  return <Abandoned rows={rows} campaigns={(camps || []).map((c) => ({ id: c.id, name: c.name }))} />;
}
