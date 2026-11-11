"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Compose from "@/components/Compose";
import { markRecovery } from "@/app/admin/messages/actions";
import { Pager, csvDownload, fmt, num } from "@/components/ui";

export type ARow = { id: string; ts: string; name: string; email: string; phone: string; amount: number; campaignId: string; campaign: string; link: string; layer: string; state: "abandoned" | "rescued" | "completed"; rescuedAmount: number; recoverySent: string };

export default function Abandoned({ rows, campaigns }: { rows: ARow[]; campaigns: { id: string; name: string }[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<"abandoned" | "rescued">("abandoned");
  const [camp, setCamp] = useState("");
  const [page, setPage] = useState(0); const [per, setPer] = useState(30);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [compose, setCompose] = useState<ARow[] | null>(null);
  const old = (r: ARow) => Date.now() - new Date(r.ts).getTime() > 30 * 6e4;
  const list = useMemo(() => rows.filter((r) => r.state === tab && (tab !== "abandoned" || old(r)) && (!camp || r.campaignId === camp)), [rows, tab, camp]);
  const shown = list.slice(page * per, page * per + per);
  const allSel = list.length > 0 && list.every((r) => sel.has(r.id));
  const chosen = () => (sel.size ? list.filter((r) => sel.has(r.id)) : list.filter((r) => !r.recoverySent));
  const when = (iso: string) => new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", month: "2-digit", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const tot = (s: ARow["state"]) => rows.filter((r) => r.state === s && (s !== "abandoned" || old(r)) && (!camp || r.campaignId === camp));
  return (
    <div>
      <div className="toolbar"><h1 className="section-h" style={{ margin: 0 }}>Abandoned donations</h1>
        <select className="in" value={camp} onChange={(e) => { setCamp(e.target.value); setPage(0); }} style={{ maxWidth: 320 }} aria-label="Campaign"><option value="">All campaigns</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </div>
      <div className="kpis num">
        <div className="kpi cc-bad"><span>Abandoned</span><b>{fmt(tot("abandoned").reduce((s, r) => s + r.amount, 0))}</b><small>{num(tot("abandoned").length)} people started and stopped</small></div>
        <div className="kpi cc-good"><span>Rescued</span><b>{fmt(tot("rescued").reduce((s, r) => s + r.rescuedAmount, 0))}</b><small>{num(tot("rescued").length)} came back and gave</small></div>
        <div className="kpi"><span>Completed first try</span><b>{num(tot("completed").length)}</b><small>of {num(tot("completed").length + tot("abandoned").length + tot("rescued").length)} checkouts started</small></div>
      </div>
      <div className="cc-tabs" role="tablist">
        <button type="button" role="tab" className="cc-tab" aria-selected={tab === "abandoned"} onClick={() => { setTab("abandoned"); setPage(0); setSel(new Set()); }}>Abandoned donations<span className="num">{num(tot("abandoned").length)}</span></button>
        <button type="button" role="tab" className="cc-tab" aria-selected={tab === "rescued"} onClick={() => { setTab("rescued"); setPage(0); setSel(new Set()); }}>Rescued donations<span className="num">{num(tot("rescued").length)}</span></button>
      </div>
      {tab === "abandoned" && list.length > 0 && (
        <div className="toolbar"><span className="meta">Checkouts that were started over 30 minutes ago and never finished.</span>
          <div className="acts">
            <button type="button" className="btn sm" onClick={() => setCompose(chosen())}>Send recovery email{sel.size ? ` (${sel.size})` : ""}</button>
            <button type="button" className="btn ghost sm" onClick={() => csvDownload("abandoned.csv", ["Name", "Campaign", "Ambassador / team", "Email", "Phone", "Amount", "Created at", "Recovery email sent"], list.map((r) => [r.name, r.campaign, r.layer, r.email, r.phone, r.amount, when(r.ts), r.recoverySent ? when(r.recoverySent) : "No"]))}>CSV</button>
          </div>
        </div>
      )}
      {!list.length ? <div className="donors"><div className="empty">{tab === "abandoned" ? "Nobody has dropped off at checkout. They'll show here if they do." : "No rescued donations yet."}</div></div> : <>
        <div className="tw cd-sticky"><table>
          <thead><tr>{tab === "abandoned" && <th style={{ width: 34 }}><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(list.map((r) => r.id)))} aria-label="Select all" /></th>}<th>Name</th><th>Campaign</th><th>Ambassador / team</th><th>Email</th><th>Phone</th><th className="r">Amount</th><th>Created at</th>{tab === "abandoned" ? <th>Recovery email sent</th> : <th className="r">Gave</th>}</tr></thead>
          <tbody>{shown.map((r) => (
            <tr key={r.id} className={sel.has(r.id) ? "cc-sel" : ""}>
              {tab === "abandoned" && <td><input type="checkbox" checked={sel.has(r.id)} onChange={() => setSel((s) => { const n = new Set(s); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })} aria-label={`Select ${r.name}`} /></td>}
              <td><b>{r.name}</b></td><td className="meta">{r.campaign}</td><td className="meta">{r.layer || "—"}</td><td className="meta">{r.email}</td>
              <td className="num">{r.phone ? <a href={`sms:${r.phone}?&body=${encodeURIComponent(`Hi ${r.name.split(" ")[0]}, thank you for starting a gift to ${r.campaign}! If anything got stuck, here's the link: ${r.link}`)}`}>{r.phone}</a> : "—"}</td>
              <td className="r num">{fmt(r.amount, true)}</td><td className="meta num">{when(r.ts)}</td>
              {tab === "abandoned" ? <td>{r.recoverySent ? <span className="pill ok">Yes</span> : <span className="pill off">No</span>}</td> : <td className="r num"><b>{fmt(r.rescuedAmount)}</b></td>}
            </tr>
          ))}</tbody>
        </table></div>
        <Pager page={page} per={per} total={list.length} set={setPage} setPer={(n) => { setPer(n); setPage(0); }} />
      </>}
      {compose && (
        <Compose
          recipients={compose.map((r) => ({ name: r.name, email: r.email, phone: r.phone, vars: { AMOUNT: fmt(r.amount), CAMPAIGN: r.campaign, LINK: r.link, AMBASSADOR: r.layer } }))}
          recipientType="donors" kind="recovery" campaignId={compose[0]?.campaignId}
          subject="Did something get stuck, {{FIRST}}?"
          body={"Hi {{FIRST}},\n\nThank you for starting a {{AMOUNT}} gift to {{CAMPAIGN}}! It looks like it didn't go through. If anything got stuck, you can finish here in a minute:\n{{LINK}}\n\nThank you so much,\nThe Lighthouse Project"}
          tags={[["FIRST", "First name"], ["AMOUNT", "Amount they started"], ["CAMPAIGN", "Campaign"], ["AMBASSADOR", "Ambassador"], ["LINK", "Link back to the donate page"]]}
          onClose={() => setCompose(null)}
          onSent={() => { markRecovery(compose.map((r) => r.id)).then(() => router.refresh()); }}
        />
      )}
    </div>
  );
}
