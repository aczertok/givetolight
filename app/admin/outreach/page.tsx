import { requireAdmin, allRows } from "@/lib/admin";
import { normPhone, SITE_URL } from "@/lib/format";
import Outreach from "@/components/Outreach";
import type { G } from "@/lib/people";
import { saveTemplates } from "../actions";

type Row = { campaign_id: string; donor_name: string; donor_email: string | null; donor_phone: string | null; amount: number; created_at: string; ambassador_id: string | null; ambassador_name: string | null };

export default async function OutreachPage() {
  const { sb } = await requireAdmin();
  const { data: campaigns } = await sb.from("campaigns").select("id, name, slug, kind, year, status").order("year", { ascending: true, nullsFirst: false });
  const rows = await allRows<Row>((a, b) => sb.from("donations").select("campaign_id, donor_name, donor_email, donor_phone, amount, created_at, ambassador_id, ambassador_name").eq("status", "succeeded").order("created_at").range(a, b));
  const { data: ambs } = await sb.from("ambassadors").select("id, campaign_id, name, phone, status");
  const ambName = new Map((ambs || []).map((a) => [a.id, a.name]));
  const gifts: G[] = rows.map((r) => [r.campaign_id, r.donor_name || "Anonymous", (r.donor_email || "").toLowerCase(), normPhone(r.donor_phone), Number(r.amount), r.created_at.slice(0, 10), (r.ambassador_id && ambName.get(r.ambassador_id)) || r.ambassador_name || ""]);
  const outreach = await allRows<{ campaign_id: string; donor_key: string; texted_at: string }>((a, b) => sb.from("outreach").select("campaign_id, donor_key, texted_at").range(a, b));
  const { data: dnt } = await sb.from("do_not_text").select("donor_key");
  const { data: tpl } = await sb.from("message_templates").select("id, body");
  const t = Object.fromEntries((tpl || []).map((x) => [x.id, x.body]));
  return (
    <>
      <Outreach
        campaigns={(campaigns || []).map((c) => ({ id: c.id, name: c.name, slug: c.slug, kind: c.kind, year: c.year, status: c.status }))}
        gifts={gifts}
        ambassadors={(ambs || []).map((a) => ({ campaign_id: a.campaign_id, name: a.name, phone: a.phone || "", status: a.status }))}
        texted={outreach.map((o) => [o.campaign_id, o.donor_key, o.texted_at.slice(0, 10)])}
        doNotText={(dnt || []).map((d) => d.donor_key)}
        templates={{ donor: t.donor || "", ambassador: t.ambassador || "" }}
        siteUrl={SITE_URL}
      />
      <form className="panel" action={saveTemplates} style={{ marginTop: 28, maxWidth: 860 }}>
        <h2>Message wording</h2>
        <p>Words in braces fill in for each person: {"{first}"}, {"{amount}"} (their last gift), {"{kind}"}, {"{campaign}"}, {"{link}"}, and for ambassadors {"{raised}"}.</p>
        <label className="f">Donors who haven&apos;t given yet<textarea className="in" name="donor" rows={4} defaultValue={t.donor} /></label>
        <label className="f">Ambassador invite<textarea className="in" name="ambassador" rows={3} defaultValue={t.ambassador} /></label>
        <button className="btn" style={{ justifySelf: "start" }}>Save wording</button>
      </form>
    </>
  );
}
