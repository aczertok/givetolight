import Link from "next/link";
import { requireAdmin, METHOD_LABEL } from "@/lib/admin";
import { matchMath } from "@/lib/data";
import { money, timeAgo, SITE_HOST } from "@/lib/format";

export default async function AdminHome() {
  const { sb, user } = await requireAdmin();
  const { data: campaigns } = await sb.from("campaigns").select("id, slug, name, kind, year, status, goal, match_multiplier, match_cap, ends_at, created_at").order("year", { ascending: false, nullsFirst: true }).order("created_at", { ascending: false });
  const { data: tot } = await sb.rpc("admin_campaign_totals");
  const totals = new Map(((tot || []) as { campaign_id: string; gifts: number; raised: number }[]).map((t) => [t.campaign_id, { gifts: Number(t.gifts), raised: Number(t.raised) }]));
  const list = campaigns || [];
  const live = list.filter((c) => c.status === "live");
  const drafts = list.filter((c) => c.status === "draft");
  const { count: pending } = await sb.from("ambassadors").select("id", { count: "exact", head: true }).eq("status", "pending");
  const { data: latest } = await sb.from("donations").select("id, created_at, donor_name, anonymous, amount, method, campaign_id").neq("provider", "import").eq("status", "succeeded").order("created_at", { ascending: false }).limit(8);
  const since = new Date(Date.now() - 864e5).toISOString();
  const { data: today } = live.length ? await sb.from("donations").select("amount, campaign_id").in("campaign_id", live.map((c) => c.id)).eq("status", "succeeded").gte("created_at", since) : { data: [] };
  const { data: ambs } = live.length ? await sb.from("ambassadors").select("campaign_id, status").in("campaign_id", live.map((c) => c.id)) : { data: [] };
  const name = (user.user_metadata?.full_name as string) || (user.email || "").split("@")[0];
  const cname = new Map(list.map((c) => [c.id, c.name]));
  const hour = Number(new Date().toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false }));

  return (
    <>
      <div className="adm-h">
        <div><h1>{hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}, {name.split(" ")[0]}</h1><p>{new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric" })}</p></div>
        <Link className="btn" href="/admin/campaigns/new">+ New campaign</Link>
      </div>

      {(pending || 0) > 0 && <Link href="/admin/ambassadors" className="ov-alert"><b>{pending}</b> ambassador page{pending === 1 ? " is" : "s are"} waiting for your approval →</Link>}

      <div className="ov-actions">
        <Link href="/admin/campaigns/new" className="ov-act"><b>Create a campaign</b><span>Its own web address, like {SITE_HOST}/volley2027</span></Link>
        <Link href="/admin/compare" className="ov-act"><b>Who hasn&apos;t given yet</b><span>Compare this year with last year and message them</span></Link>
        <Link href="/admin/ambassador-compare" className="ov-act"><b>Send ambassadors their lists</b><span>Each one gets the donors they&apos;re missing</span></Link>
        <Link href="/admin/donations" className="ov-act"><b>Add a check or cash gift</b><span>Or search and download all donations</span></Link>
      </div>

      <h2 className="ov-h">Live now</h2>
      {!live.length ? (
        <div className="ov-empty">
          <b>No campaign is live right now.</b>
          <span>{drafts.length ? <>You have {drafts.length} draft{drafts.length > 1 ? "s" : ""}. Open it, check everything, and set its status to <b>Live</b>.</> : <>Create your next campaign, give it a web address, and set it to <b>Live</b> when you&apos;re ready.</>}</span>
          <Link className="btn sm" href={drafts.length ? `/admin/campaigns/${drafts[0].id}` : "/admin/campaigns/new"}>{drafts.length ? `Open ${drafts[0].name}` : "+ New campaign"}</Link>
        </div>
      ) : live.map((c) => {
        const t = totals.get(c.id) || { gifts: 0, raised: 0 };
        const mm = matchMath({ match_multiplier: Number(c.match_multiplier), match_cap: c.match_cap == null ? null : Number(c.match_cap) }, t.raised);
        const day = (today || []).filter((d) => d.campaign_id === c.id);
        const pctv = c.goal ? Math.min(100, (mm.total / Number(c.goal)) * 100) : 0;
        return (
          <div key={c.id} className="ov-live">
            <div className="ov-live-top">
              <div><div className="ov-live-name">{c.name}</div><a className="meta" href={`/${c.slug}`}>{SITE_HOST}/{c.slug}</a></div>
              <div className="acts"><Link className="btn sm" href={`/admin/campaigns/${c.id}/dashboard`}>Open dashboard</Link><Link className="btn ghost sm" href={`/admin/campaigns/${c.id}`}>Edit</Link></div>
            </div>
            <div className="ov-live-money num"><b>{money(mm.total)}</b><span>{c.goal ? `raised of ${money(c.goal)} · ${Math.round((mm.total / Number(c.goal)) * 100)}%` : "raised"}{Number(c.match_multiplier) > 1 ? ` · includes ${money(mm.matched)} match` : ""}</span></div>
            <div className="track"><div className="fill" style={{ width: `${pctv}%` }} /></div>
            <div className="ov-live-stats num">
              <div><b>{t.gifts}</b><span>gifts</span></div>
              <div><b>{money(day.reduce((s, d) => s + Number(d.amount), 0))}</b><span>last 24 hours</span></div>
              <div><b>{(ambs || []).filter((a) => a.campaign_id === c.id && a.status === "live").length}</b><span>ambassadors</span></div>
              <div><b>{c.ends_at ? (new Date(c.ends_at).getTime() > Date.now() ? `${Math.ceil((new Date(c.ends_at).getTime() - Date.now()) / 864e5)} days` : "ended") : "—"}</b><span>left</span></div>
            </div>
          </div>
        );
      })}

      <div className="toolbar" style={{ marginTop: 28 }}><h2 className="ov-h" style={{ margin: 0 }}>All campaigns</h2><Link className="meta" href="/admin/campaigns">Manage →</Link></div>
      <div className="ov-grid">
        {list.filter((c) => c.status !== "live").slice(0, 9).map((c) => {
          const t = totals.get(c.id) || { gifts: 0, raised: 0 };
          return (
            <Link key={c.id} href={c.status === "draft" ? `/admin/campaigns/${c.id}` : `/admin/campaigns/${c.id}/dashboard`} className="ov-card">
              <div className="ov-card-top"><span className={`pill ${c.status === "draft" ? "wait" : "off"}`}>{c.status}</span><span className="meta">{c.kind}{c.year ? ` · ${c.year}` : ""}</span></div>
              <b>{c.name}</b>
              <span className="meta">{SITE_HOST}/{c.slug}</span>
              <div className="ov-card-n num"><b>{money(t.raised)}</b><span>{t.gifts} gifts</span></div>
            </Link>
          );
        })}
      </div>

      <div className="toolbar" style={{ marginTop: 28 }}><h2 className="ov-h" style={{ margin: 0 }}>Latest gifts</h2><Link className="meta" href="/admin/donations">All donations →</Link></div>
      {!latest?.length ? <div className="ov-empty"><span>New donations will appear here as they come in.</span></div> : (
        <div className="tw"><table><tbody>
          {latest.map((d) => <tr key={d.id}><td><b>{d.donor_name || "Anonymous"}</b>{d.anonymous ? " (anon.)" : ""}</td><td className="meta">{cname.get(d.campaign_id)}</td><td className="meta">{METHOD_LABEL[d.method || ""] || d.method}</td><td className="meta">{timeAgo(d.created_at)}</td><td className="r num"><b>{money(d.amount)}</b></td></tr>)}
        </tbody></table></div>
      )}
    </>
  );
}
