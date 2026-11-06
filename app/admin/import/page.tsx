import { requireAdmin } from "@/lib/admin";
import Importer from "@/components/Importer";

export default async function ImportPage() {
  const { sb } = await requireAdmin();
  const { data: campaigns } = await sb.from("campaigns").select("id, name, status, kind, year").order("year", { ascending: false, nullsFirst: true });
  const { data: tot } = await sb.rpc("admin_campaign_totals");
  return (
    <>
      <h1 className="section-h" style={{ marginTop: 0 }}>Import a past campaign</h1>
      <p className="meta" style={{ maxWidth: 760, marginBottom: 16 }}>
        Bring in donor exports from CauseMatch, Charidy or Chariot so Outreach can compare years. Imported gifts never show on the public site.
        Create the campaign first under Campaigns (status <b>Ended</b>), then import its file here. Save Excel files as CSV first.
      </p>
      <Importer campaigns={(campaigns || []).map((c) => ({ id: c.id, name: c.name, status: c.status }))} totals={(tot || []) as { campaign_id: string; gifts: number; raised: number }[]} />
    </>
  );
}
