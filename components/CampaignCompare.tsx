"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { comparePeople, type CG, type CPerson } from "@/lib/compare";
import type { CampaignLite } from "@/lib/loadGifts";
import Compose from "@/components/Compose";
import { Pager, PickPair, csvDownload, fmt, num, pct } from "@/components/ui";

type Tab = "prev" | "both" | "next";

export default function CampaignCompare({ campaigns, prev, next, prevGifts, nextGifts, siteUrl }: {
  campaigns: CampaignLite[]; prev: CampaignLite | null; next: CampaignLite | null; prevGifts: CG[]; nextGifts: CG[]; siteUrl: string;
}) {
  const router = useRouter();
  const people = useMemo(() => comparePeople(prevGifts, nextGifts), [prevGifts, nextGifts]);
  const groups = useMemo(() => ({
    prev: people.filter((p) => p.prev > 0 && !p.next).sort((a, b) => b.prev - a.prev),
    both: people.filter((p) => p.prev > 0 && p.next > 0).sort((a, b) => b.next - a.next),
    next: people.filter((p) => !p.prev && p.next > 0).sort((a, b) => b.next - a.next),
  }), [people]);
  const missing = groups.prev.reduce((s, p) => s + p.prev, 0);
  const resecured = groups.both.reduce((s, p) => s + p.next, 0);
  const avgChange = groups.both.length ? groups.both.reduce((s, p) => s + (p.next - p.prev), 0) / groups.both.length : 0;
  const upgraded = groups.both.filter((p) => p.next > p.prev).length;
  const downgraded = groups.both.filter((p) => p.next < p.prev).length;
  const newMoney = groups.next.reduce((s, p) => s + p.next, 0);
  const prevDonors = groups.prev.length + groups.both.length;

  const [tab, setTab] = useState<Tab>("prev");
  const [q, setQ] = useState("");
  const [amb, setAmb] = useState("");
  const [min, setMin] = useState("");
  const [change, setChange] = useState("all");
  const [sort, setSort] = useState<[keyof CPerson | "diff", number]>(["prev", -1]);
  const [page, setPage] = useState(0);
  const [per, setPer] = useState(30);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [compose, setCompose] = useState<null | CPerson[]>(null);

  const ambs = useMemo(() => [...new Set(people.flatMap((p) => [p.prevAmb, p.nextAmb]).filter(Boolean))].sort(), [people]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase(), lo = Number(min) || 0;
    const r = groups[tab].filter((p) => (!s || `${p.name} ${p.email} ${p.phone}`.toLowerCase().includes(s)) && (!amb || p.prevAmb === amb || p.nextAmb === amb) &&
      Math.max(p.prev, p.next) >= lo && (tab !== "both" || change === "all" || (change === "up" ? p.next > p.prev : change === "down" ? p.next < p.prev : p.next === p.prev)));
    const get = (p: CPerson) => (sort[0] === "diff" ? p.next - p.prev : p[sort[0] as keyof CPerson]);
    return [...r].sort((a, b) => { const x = get(a), y = get(b); return (x > y ? 1 : x < y ? -1 : 0) * sort[1]; });
  }, [groups, tab, q, amb, min, change, sort]);
  const shown = rows.slice(page * per, page * per + per);
  const allSel = rows.length > 0 && rows.every((p) => sel.has(p.key));
  const toggleAll = () => setSel(allSel ? new Set() : new Set(rows.map((p) => p.key)));
  const chosen = () => (sel.size ? rows.filter((p) => sel.has(p.key)) : rows);
  const th = (k: keyof CPerson | "diff", l: string, r = true) => (
    <th className={r ? "r" : ""} aria-sort={sort[0] === k ? (sort[1] > 0 ? "ascending" : "descending") : "none"}><button type="button" className="an-sort" onClick={() => { setSort(([x, d]) => [k, x === k ? -d : -1]); setPage(0); }}>{l}{sort[0] === k ? (sort[1] > 0 ? " ↑" : " ↓") : ""}</button></th>
  );
  const go = (p?: string, n?: string) => router.push(`/admin/compare?prev=${p || ""}&next=${n || ""}`);
  const link = next ? `${siteUrl}/${next.slug}` : siteUrl;
  const defaults: Record<Tab, [string, string]> = {
    prev: ["Can we count on your support again, {{FIRST}}?", `Dear {{FIRST}},\n\nLast year you gave {{PREV_AMOUNT}} to ${prev?.name || "The Lighthouse Project"}, and it made a real difference for the girls.\n\n${next?.name || "Our new campaign"} is live now, and we'd be so grateful for your support again:\n{{LINK}}\n\nWith thanks,\nThe Lighthouse Project`],
    both: ["Thank you, {{FIRST}}!", `Dear {{FIRST}},\n\nThank you for giving again this year. Your {{NEW_AMOUNT}} to ${next?.name || "the campaign"} means so much.\n\nWith gratitude,\nThe Lighthouse Project`],
    next: ["Welcome, {{FIRST}}", `Dear {{FIRST}},\n\nThank you for your first gift to The Lighthouse Project. We're so glad you're with us.\n\nWith gratitude,\nThe Lighthouse Project`],
  };

  return (
    <div>
      <div className="toolbar"><h1 className="section-h" style={{ margin: 0 }}>Campaign compare</h1></div>
      <PickPair campaigns={campaigns} prev={prev?.id || ""} next={next?.id || ""} onChange={go} />
      {!prev || !next ? <div className="donors"><div className="empty">Pick two campaigns to compare.</div></div> : <>
        <div className="kpis num cc-kpis">
          <div className="kpi cc-bad"><span>Missing amount</span><b>{fmt(missing)}</b><small>{num(groups.prev.length)} donors gave {prev.name.length > 28 ? "last time" : "to " + prev.name} but not yet to this one</small></div>
          <div className="kpi cc-good"><span>Re-secured amount</span><b>{fmt(resecured)}</b><small>from {num(groups.both.length)} returning donors ({pct(prevDonors ? groups.both.length / prevDonors : 0)} came back)</small></div>
          <div className="kpi"><span>Average change</span><b className={avgChange >= 0 ? "an-up" : "an-down"}>{avgChange >= 0 ? "+" : "−"}{fmt(Math.abs(avgChange), true)}</b><small>per returning donor · {num(upgraded)} gave more, {num(downgraded)} gave less</small></div>
          <div className="kpi"><span>New donors</span><b>{num(groups.next.length)}</b><small>gave {fmt(newMoney)} for the first time in this pair</small></div>
        </div>

        <div className="cc-tabs" role="tablist">
          {([["prev", "Donated to previous campaign", groups.prev.length], ["both", "Donated to both campaigns", groups.both.length], ["next", "Donated to new campaign", groups.next.length]] as [Tab, string, number][]).map(([t, l, n]) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} className="cc-tab" onClick={() => { setTab(t); setPage(0); setSel(new Set()); setSort([t === "prev" ? "prev" : "next", -1]); }}>{l}<span className="num">{num(n)}</span></button>
          ))}
        </div>

        <div className="an-filters">
          <input className="search" placeholder="Search name, email, phone" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
          <select className="in" value={amb} onChange={(e) => { setAmb(e.target.value); setPage(0); }} aria-label="Ambassador or team"><option value="">All ambassadors &amp; teams</option>{ambs.map((a) => <option key={a}>{a}</option>)}</select>
          <input className="in num an-amt" placeholder="Min $" inputMode="decimal" value={min} onChange={(e) => { setMin(e.target.value.replace(/[^\d.]/g, "")); setPage(0); }} aria-label="Minimum amount" />
          {tab === "both" && <select className="in" value={change} onChange={(e) => setChange(e.target.value)} aria-label="Change"><option value="all">Any change</option><option value="up">Gave more</option><option value="down">Gave less</option><option value="same">Same amount</option></select>}
          <span style={{ flex: 1 }} />
          <button type="button" className="btn sm" onClick={() => setCompose(chosen())} disabled={!rows.length}>Compose message{sel.size ? ` (${sel.size})` : ` (all ${num(rows.length)})`}</button>
          <button type="button" className="btn ghost sm" onClick={() => csvDownload(`compare-${tab}.csv`, ["Status", "Name", "Email", "Phone", `Gave ${prev.name}`, `Gave ${next.name}`, "Change", "Ambassador (previous)", "Ambassador (new)"],
            chosen().map((p) => [tab === "prev" ? "Didn't donate" : tab === "both" ? "Donated to both" : "New donor", p.name, p.email, p.phone, p.prev || "", p.next || "", p.prev && p.next ? p.next - p.prev : "", p.prevAmb, p.nextAmb]))}>CSV</button>
        </div>

        {!rows.length ? <div className="donors"><div className="empty">Nobody here{q || amb || min ? " with these filters" : ""}.</div></div> : <>
          <div className="tw cd-sticky"><table>
            <thead><tr>
              <th style={{ width: 34 }}><input type="checkbox" checked={allSel} onChange={toggleAll} aria-label="Select all" /></th>
              <th>Status</th>{th("name", "Name", false)}<th>Email</th><th>Phone</th>
              {tab !== "next" && th("prev", prev.year ? `Previous (${prev.year})` : "Previous")}
              {tab !== "prev" && th("next", next.year ? `New (${next.year})` : "New")}
              {tab === "both" && th("diff", "Change")}
              <th>Ambassador / team</th>{th("lastDate", "Last gift")}
            </tr></thead>
            <tbody>{shown.map((p) => (
              <tr key={p.key} className={sel.has(p.key) ? "cc-sel" : ""}>
                <td><input type="checkbox" checked={sel.has(p.key)} onChange={() => setSel((s) => { const n = new Set(s); if (n.has(p.key)) n.delete(p.key); else n.add(p.key); return n; })} aria-label={`Select ${p.name}`} /></td>
                <td><span className={`pill ${tab === "prev" ? "wait" : "ok"}`}>{tab === "prev" ? "Didn't donate" : tab === "both" ? "Both" : "New"}</span></td>
                <td><b>{p.name}</b></td>
                <td className="meta">{p.email || "—"}</td>
                <td className="num">{p.phone ? <a href={`sms:${p.phone}`}>{p.phone}</a> : "—"}</td>
                {tab !== "next" && <td className="r num">{fmt(p.prev)}</td>}
                {tab !== "prev" && <td className="r num"><b>{fmt(p.next)}</b></td>}
                {tab === "both" && <td className="r num"><span className={p.next >= p.prev ? "an-up" : "an-down"}>{p.next === p.prev ? "=" : (p.next > p.prev ? "▲ " : "▼ ") + fmt(Math.abs(p.next - p.prev))}</span></td>}
                <td className="meta">{(tab === "prev" ? p.prevAmb : p.nextAmb || p.prevAmb) || "—"}</td>
                <td className="meta num">{p.lastDate || "—"}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <Pager page={page} per={per} total={rows.length} set={setPage} setPer={(n) => { setPer(n); setPage(0); }} />
        </>}
      </>}
      {compose && (
        <Compose
          recipients={compose.map((p) => ({ name: p.name, email: p.email, phone: p.phone, vars: { PREV_AMOUNT: fmt(p.prev), NEW_AMOUNT: fmt(p.next), AMBASSADOR: p.prevAmb || p.nextAmb, CAMPAIGN: next?.name || "", LINK: link } }))}
          recipientType="donors" campaignId={next?.id} subject={defaults[tab][0]} body={defaults[tab][1]}
          tags={[["FIRST", "First name"], ["NAME", "Full name"], ["PREV_AMOUNT", "What they gave last time"], ["NEW_AMOUNT", "What they gave this time"], ["AMBASSADOR", "Who they gave through"], ["CAMPAIGN", "New campaign name"], ["LINK", "Link to the new campaign"]]}
          onClose={() => setCompose(null)}
        />
      )}
    </div>
  );
}
