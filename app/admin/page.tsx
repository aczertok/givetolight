import Link from "next/link";
import { requireAdmin, allRows, type Gift, METHOD_LABEL } from "@/lib/admin";
import { matchMath } from "@/lib/data";
import { money, timeAgo } from "@/lib/format";
import { Progress } from "@/components/Bits";

export default async function AdminHome() {
  const { sb } = await requireAdmin();
  const { data: campaigns } = await sb.from("campaigns").select("*").order("created_at", { ascending: false });
  const active = (campaigns || []).filter((c) => c.status !== "ended");
  const live = (campaigns || []).filter((c) => c.status === "live");
  const ids = live.map((c) => c.id);
  const gifts = ids.length
    ? await allRows<Gift>((a, b) => sb.from("donations").select("*").in("campaign_id", ids).eq("status", "succeeded").order("created_at", { ascending: false }).range(a, b))
    : [];
  const { count: pending } = await sb.from("ambassadors").select("id", { count: "exact", head: true }).eq("status", "pending");
  const dayAgo = Date.now() - 864e5;
  return (
    <>
      <div className="toolbar">
        <h1 className="section-h" style={{ margin: 0 }}>Overview</h1>
        <Link className="btn" href="/admin/campaigns/new">New campaign</Link>
      </div>
      {(pending || 0) > 0 && <p className="note-box"><b>{pending}</b> ambassador page{pending === 1 ? " is" : "s are"} waiting for your approval. <Link href="/admin/ambassadors">Review</Link></p>}
      {!live.length && <div className="donors"><div className="empty">No campaign is live. {active.length ? <Link href="/admin/campaigns">Open your campaigns</Link> : <Link href="/admin/campaigns/new">Create your first campaign</Link>}</div></div>}
      {live.map((c) => {
        const g = gifts.filter((x) => x.campaign_id === c.id);
        const raised = g.reduce((s, x) => s + Number(x.amount), 0);
        const mm = matchMath({ match_multiplier: Number(c.match_multiplier), match_cap: c.match_cap == null ? null : Number(c.match_cap) }, raised);
        const day = g.filter((x) => new Date(x.created_at).getTime() > dayAgo);
        const byMethod = new Map<string, number>();
        g.forEach((x) => byMethod.set(x.method || "other", (byMethod.get(x.method || "other") || 0) + Number(x.amount)));
        return (
          <section key={c.id} style={{ marginBottom: 28 }}>
            <h2 className="section-h"><Link href={`/admin/campaigns/${c.id}`}>{c.name}</Link> <span className="meta" style={{ fontFamily: "var(--body)", fontSize: 14 }}>givetolight.com/{c.slug}</span></h2>
            <div className="kpis num">
              <div className="kpi"><span>Raised with match</span><b>{money(mm.total)}</b><small>{c.goal ? `${Math.round((mm.total / Number(c.goal)) * 100)}% of ${money(c.goal)}` : "no goal set"}</small></div>
              <div className="kpi"><span>From donors</span><b>{money(raised)}</b><small>{g.length} gifts{g.length ? ` · avg ${money(raised / g.length)}` : ""}</small></div>
              {Number(c.match_multiplier) > 1 && <div className="kpi"><span>Match used</span><b>{money(mm.matched)}</b><small>{c.match_cap ? `of ${money(c.match_cap)} pledged` : "no cap set"}</small></div>}
              <div className="kpi"><span>Last 24 hours</span><b>{money(day.reduce((s, x) => s + Number(x.amount), 0))}</b><small>{day.length} gifts</small></div>
              <div className="kpi"><span>By method</span><b style={{ fontSize: 15, fontFamily: "var(--body)" }}>{[...byMethod].sort((a, b) => b[1] - a[1]).map(([m, v]) => `${METHOD_LABEL[m] || m} ${money(v)}`).join(" · ") || "—"}</b></div>
            </div>
            <Progress value={mm.total} goal={c.goal ? Number(c.goal) : null} />
          </section>
        );
      })}
      {gifts.length > 0 && (
        <>
          <div className="toolbar"><h2 className="section-h" style={{ margin: 0 }}>Latest gifts</h2><Link href="/admin/donations">All donations</Link></div>
          <div className="tw"><table><thead><tr><th>When</th><th>Donor</th><th className="r">Amount</th><th>Method</th><th>Campaign</th></tr></thead><tbody>
            {gifts.slice(0, 15).map((d) => (
              <tr key={d.id}><td>{timeAgo(d.created_at)}</td><td>{d.donor_name || "—"}{d.anonymous ? " (anon.)" : ""}</td><td className="r num">{money(d.amount)}</td><td>{METHOD_LABEL[d.method || ""] || d.method}</td><td>{live.find((c) => c.id === d.campaign_id)?.name}</td></tr>
            ))}
          </tbody></table></div>
        </>
      )}
    </>
  );
}
