import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { money } from "@/lib/format";

export default async function Campaigns() {
  const { sb } = await requireAdmin();
  const { data } = await sb.from("campaigns").select("id, slug, name, kind, year, status, goal").order("year", { ascending: false, nullsFirst: true }).order("created_at", { ascending: false });
  const { data: tot } = await sb.rpc("admin_campaign_totals");
  const byId = new Map(((tot || []) as { campaign_id: string; gifts: number; raised: number }[]).map((t) => [t.campaign_id, t]));
  const totals = (data || []).map((c) => ({ count: Number(byId.get(c.id)?.gifts || 0), sum: Number(byId.get(c.id)?.raised || 0) }));
  return (
    <>
      <div className="toolbar"><h1 className="section-h" style={{ margin: 0 }}>Campaigns</h1><Link className="btn" href="/admin/campaigns/new">New campaign</Link></div>
      <div className="tw"><table><thead><tr><th>Campaign</th><th>Address</th><th>Type</th><th>Status</th><th className="r">Gifts</th><th className="r">Raised</th><th className="r">Goal</th></tr></thead><tbody>
        {(data || []).map((c, i) => (
          <tr key={c.id}>
            <td><Link href={`/admin/campaigns/${c.id}`}><b>{c.name}</b></Link></td>
            <td>{c.status === "draft" ? <span className="meta">/{c.slug}</span> : <Link href={`/${c.slug}`}>/{c.slug}</Link>}</td>
            <td>{c.kind}{c.year ? ` · ${c.year}` : ""}</td>
            <td><span className={`pill ${c.status === "live" ? "ok" : c.status === "draft" ? "wait" : "off"}`}>{c.status}</span></td>
            <td className="r num">{totals[i]?.count ?? 0}</td>
            <td className="r num">{money(totals[i]?.sum ?? 0)}</td>
            <td className="r num">{c.goal ? money(c.goal) : "—"}</td>
          </tr>
        ))}
      </tbody></table></div>
      {!data?.length && <div className="donors" style={{ marginTop: 12 }}><div className="empty">No campaigns yet.</div></div>}
    </>
  );
}
