import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { fmtPhone, money, SITE_HOST } from "@/lib/format";
import { setAmbassadorStatus } from "../actions";

export default async function Ambassadors({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const sp = await searchParams;
  const { sb } = await requireAdmin();
  const { data: campaigns } = await sb.from("campaigns").select("id, name, slug, status").order("created_at", { ascending: false });
  let query = sb.from("ambassadors").select("id, campaign_id, team_id, name, slug, goal, phone, email, status, created_at, user_id").order("status").order("created_at", { ascending: false });
  if (sp.c) query = query.eq("campaign_id", sp.c);
  const { data: ambs } = await query;
  const ids = (ambs || []).map((a) => a.id);
  const { data: gifts } = ids.length ? await sb.from("donations").select("ambassador_id, amount").in("ambassador_id", ids).eq("status", "succeeded") : { data: [] };
  const raised = new Map<string, { sum: number; n: number }>();
  (gifts || []).forEach((g) => { const e = raised.get(g.ambassador_id!) || { sum: 0, n: 0 }; e.sum += Number(g.amount); e.n++; raised.set(g.ambassador_id!, e); });
  const cmap = new Map((campaigns || []).map((c) => [c.id, c]));
  const pending = (ambs || []).filter((a) => a.status === "pending");
  return (
    <>
      <div className="toolbar">
        <h1 className="section-h" style={{ margin: 0 }}>Ambassadors</h1>
        <form action="/admin/ambassadors" style={{ display: "flex", gap: 8 }}>
          <select className="in" name="c" defaultValue={sp.c || ""} aria-label="Campaign"><option value="">All campaigns</option>{(campaigns || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <button className="btn ghost">Show</button>
        </form>
      </div>
      {pending.length > 0 && <p className="note-box"><b>{pending.length}</b> waiting for approval, listed first.</p>}
      <div className="tw"><table><thead><tr><th>Status</th><th>Ambassador</th><th>Campaign</th><th>Phone</th><th>Email</th><th className="r">Raised</th><th className="r">Goal</th><th className="r">Donors</th><th></th></tr></thead><tbody>
        {(ambs || []).map((a) => {
          const c = cmap.get(a.campaign_id);
          const r = raised.get(a.id);
          return (
            <tr key={a.id}>
              <td><span className={`pill ${a.status === "live" ? "ok" : a.status === "pending" ? "wait" : "off"}`}>{a.status === "pending" ? "Waiting" : a.status}</span></td>
              <td>{a.status === "live" && c ? <Link href={`/${c.slug}/${a.slug}`}>{a.name}</Link> : a.name}{!a.user_id && <span className="meta"> · added by staff</span>}</td>
              <td>{c?.name}</td>
              <td>{a.phone ? <a href={`sms:${a.phone}`}>{fmtPhone(a.phone)}</a> : "—"}</td>
              <td>{a.email || "—"}</td>
              <td className="r num">{money(r?.sum || 0)}</td>
              <td className="r num">{a.goal ? money(a.goal) : "—"}</td>
              <td className="r num">{r?.n || 0}</td>
              <td>
                <form action={setAmbassadorStatus} style={{ display: "flex", gap: 6 }}>
                  <input type="hidden" name="id" value={a.id} />
                  {a.status !== "live" && <button className="btn sm" name="status" value="live">{a.status === "pending" ? "Approve" : "Show"}</button>}
                  {a.status !== "hidden" && <button className="btn ghost sm" name="status" value="hidden">Hide</button>}
                </form>
              </td>
            </tr>
          );
        })}
      </tbody></table></div>
      {!ambs?.length && <div className="donors" style={{ marginTop: 10 }}><div className="empty">No ambassadors yet. Share {SITE_HOST}/ambassador with your volunteers, or invite past ambassadors from Outreach.</div></div>}
    </>
  );
}
