import Link from "next/link";
import { requireAdmin, allRows, type Gift, METHOD_LABEL } from "@/lib/admin";
import { money } from "@/lib/format";
import { addOfflineGift, setDonationStatus } from "../actions";

export default async function Donations({ searchParams }: { searchParams: Promise<{ c?: string; q?: string; m?: string; s?: string; added?: string; error?: string }> }) {
  const sp = await searchParams;
  const { sb } = await requireAdmin();
  const { data: campaigns } = await sb.from("campaigns").select("id, name, status, slug").order("created_at", { ascending: false });
  const cid = sp.c || campaigns?.find((c) => c.status === "live")?.id || campaigns?.[0]?.id || "";
  const gifts = cid ? await allRows<Gift>((a, b) => sb.from("donations").select("*").eq("campaign_id", cid).order("created_at", { ascending: false }).range(a, b)) : [];
  const { data: ambs } = cid ? await sb.from("ambassadors").select("id, name, team_id").eq("campaign_id", cid).order("name") : { data: [] };
  const { data: teams } = cid ? await sb.from("teams").select("id, name").eq("campaign_id", cid).order("name") : { data: [] };
  const ambName = new Map((ambs || []).map((a) => [a.id, a.name]));
  const teamName = new Map((teams || []).map((t) => [t.id, t.name]));
  const q = (sp.q || "").toLowerCase();
  const status = sp.s || "succeeded";
  const list = gifts.filter((d) =>
    (status === "all" || d.status === status) &&
    (!sp.m || d.method === sp.m) &&
    (!q || `${d.donor_name} ${d.donor_email} ${d.donor_phone} ${ambName.get(d.ambassador_id || "") || d.ambassador_name || ""}`.toLowerCase().includes(q))
  );
  const total = list.reduce((s, d) => s + Number(d.amount), 0);
  const fees = list.reduce((s, d) => s + Number(d.fee_covered || 0), 0);
  const methods = [...new Set(gifts.map((d) => d.method || ""))].filter(Boolean);
  const qs = (o: Record<string, string>) => "?" + new URLSearchParams({ c: cid, ...(sp.q ? { q: sp.q } : {}), ...(sp.m ? { m: sp.m } : {}), s: status, ...o }).toString();
  return (
    <>
      <div className="toolbar">
        <h1 className="section-h" style={{ margin: 0 }}>Donations</h1>
        <a className="btn ghost" href={`/admin/donations/export${qs({})}`}>Download CSV</a>
      </div>
      {sp.added && <p className="note-box">Gift added.</p>}
      {sp.error && <p className="error">Enter an amount for the offline gift.</p>}
      <form className="toolbar" action="/admin/donations">
        <select className="in" name="c" defaultValue={cid} style={{ maxWidth: 300 }} aria-label="Campaign">{(campaigns || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <input className="search" name="q" defaultValue={sp.q || ""} placeholder="Search donor, email, phone, ambassador" />
        <select className="in" name="m" defaultValue={sp.m || ""} style={{ maxWidth: 170 }} aria-label="Method"><option value="">All methods</option>{methods.map((m) => <option key={m} value={m}>{METHOD_LABEL[m] || m}</option>)}</select>
        <select className="in" name="s" defaultValue={status} style={{ maxWidth: 150 }} aria-label="Status"><option value="succeeded">Completed</option><option value="pending">Processing</option><option value="refunded">Refunded</option><option value="failed">Failed</option><option value="all">All</option></select>
        <button className="btn ghost">Filter</button>
      </form>
      <p className="meta num">{list.length} gifts · {money(total, true)}{fees ? ` · donors also covered ${money(fees, true)} in fees` : ""}</p>
      <div className="tw"><table><thead><tr><th>Date</th><th>Donor</th><th>Email</th><th>Phone</th><th className="r">Amount</th><th>Method</th><th>Plan</th><th>Credited to</th><th>Dedication / message</th><th>Status</th></tr></thead><tbody>
        {list.slice(0, 1000).map((d) => (
          <tr key={d.id}>
            <td>{new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</td>
            <td>{d.donor_name || "—"}{d.anonymous ? " (anon.)" : ""}</td>
            <td>{d.donor_email || "—"}</td>
            <td>{d.donor_phone || "—"}</td>
            <td className="r num">{money(d.amount, true)}</td>
            <td>{METHOD_LABEL[d.method || ""] || d.method || "—"}{d.method_detail ? ` · ${d.method_detail}` : ""}</td>
            <td>{d.plan === "monthly" ? "Monthly" : d.plan?.startsWith("installments:") ? `${d.plan.split(":")[1]} payments` : "One-time"}</td>
            <td>{ambName.get(d.ambassador_id || "") || d.ambassador_name || teamName.get(d.team_id || "") || d.team_name || "General"}</td>
            <td style={{ whiteSpace: "normal", minWidth: 180 }}>{[d.dedication, d.message].filter(Boolean).join(" · ") || "—"}</td>
            <td>
              {d.provider === "offline" || d.provider === "import" ? (
                <form action={setDonationStatus} style={{ display: "flex", gap: 4 }}>
                  <input type="hidden" name="id" value={d.id} />
                  <select className="in" name="status" defaultValue={d.status} style={{ padding: "4px 6px", fontSize: 13 }} aria-label="Status"><option value="succeeded">Completed</option><option value="refunded">Refunded</option><option value="failed">Void</option></select>
                  <button className="btn ghost sm">Set</button>
                </form>
              ) : <span className={`pill ${d.status === "succeeded" ? "ok" : d.status === "pending" ? "wait" : "off"}`}>{d.status === "succeeded" ? "Completed" : d.status}</span>}
            </td>
          </tr>
        ))}
      </tbody></table></div>
      {list.length > 1000 && <p className="meta">Showing the latest 1,000. Download the CSV for all {list.length}.</p>}
      {!list.length && <div className="donors" style={{ marginTop: 10 }}><div className="empty">No gifts match.</div></div>}

      {cid && (
        <form className="panel" action={addOfflineGift} style={{ marginTop: 24, maxWidth: 860 }}>
          <h2>Add a check, cash or other offline gift</h2>
          <input type="hidden" name="campaign_id" value={cid} />
          <div className="form-grid">
            <label className="f">Donor name<input className="in" name="donor_name" required /></label>
            <label className="f">Amount ($)<input className="in num" name="amount" type="number" step="0.01" min="0.01" required /></label>
            <label className="f">Method<select className="in" name="method" defaultValue="check"><option value="check">Check</option><option value="cash">Cash</option><option value="zelle">Zelle</option><option value="wire">Wire</option><option value="daf">DAF (outside Chariot)</option><option value="other">Other</option></select></label>
            <label className="f">Detail (check #, fund name)<input className="in" name="method_detail" /></label>
            <label className="f">Credit to ambassador<select className="in" name="ambassador_id" defaultValue=""><option value="">None</option>{(ambs || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
            <label className="f">Or team<select className="in" name="team_id" defaultValue=""><option value="">None</option>{(teams || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            <label className="f">Email<input className="in" name="donor_email" type="email" /></label>
            <label className="f">Phone<input className="in" name="donor_phone" type="tel" /></label>
            <label className="f">Date received<input className="in" name="date" type="date" /></label>
            <label className="f">Dedication<input className="in" name="dedication" /></label>
            <label className="f full">Message for the donor wall<input className="in" name="message" /></label>
          </div>
          <label className="chk"><input type="checkbox" name="anonymous" /> Show as Anonymous on the site</label>
          <button className="btn" style={{ justifySelf: "start" }}>Add gift</button>
        </form>
      )}
      <p className="meta" style={{ marginTop: 14 }}>Card and DAF refunds are done in Stripe or Chariot; Stripe refunds update here on their own. <Link href="/admin/import">Import a past campaign&apos;s export</Link></p>
    </>
  );
}
