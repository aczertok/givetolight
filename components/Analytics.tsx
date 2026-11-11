"use client";
import { useMemo, useState } from "react";
import { buildPeople, normName, firstOf, type G } from "@/lib/people";

export type ACampaign = { id: string; name: string; slug: string; kind: string; year: number | null; status: string; goal: number | null; match: number };
// campaignId, name, email, phone, amount, date (YYYY-MM-DD), ambassador, team, method, provider
export type AGift = [string, string, string, string, number, string, string, string, string, string];

const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
const METHOD: Record<string, string> = { card: "Card", apple_pay: "Apple Pay / Google Pay", google_pay: "Apple Pay / Google Pay", wallet: "Apple Pay / Google Pay", ach: "Bank transfer", daf: "DAF", check: "Check", cash: "Cash", zelle: "Zelle", wire: "Wire", other: "Other / offline" };
const BUCKETS: [string, number, number][] = [["Under $36", 0, 36], ["$36–99", 36, 100], ["$100–179", 100, 180], ["$180–359", 180, 360], ["$360–999", 360, 1000], ["$1,000–4,999", 1000, 5000], ["$5,000+", 5000, Infinity]];
const fmt = (n: number, c = false) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: c ? 2 : 0, minimumFractionDigits: c ? 2 : 0 }).format(n || 0);
const num = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n || 0));
const pct = (n: number) => (isFinite(n) ? Math.round(n * 100) + "%" : "—");
const short = (n: number) => (n >= 1e6 ? "$" + (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? "$" + Math.round(n / 1e3) + "k" : "$" + Math.round(n));
const median = (a: number[]) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const day = (d: string) => Math.round(new Date(d + "T12:00:00Z").getTime() / 864e5);
const methodOf = (m: string) => METHOD[m] || (m ? "Other / offline" : "Not recorded");

type Tab = "compare" | "donors" | "ambassadors" | "followup" | "gifts";
export type AAmb = { name: string; phone: string; email: string };

export default function Analytics({ campaigns, gifts, ambassadors = [], siteUrl = "" }: { campaigns: ACampaign[]; gifts: AGift[]; ambassadors?: AAmb[]; siteUrl?: string }) {
  // Campaigns in time order (by first gift), each with a fixed color slot that never changes with filters.
  const ordered = useMemo(() => {
    const first: Record<string, string> = {};
    for (const g of gifts) if (!first[g[0]] || g[5] < first[g[0]]) first[g[0]] = g[5];
    return [...campaigns].sort((a, b) => (a.year || 9999) - (b.year || 9999) || (first[a.id] || "9").localeCompare(first[b.id] || "9") || a.name.localeCompare(b.name));
  }, [campaigns, gifts]);
  const color = useMemo(() => Object.fromEntries(ordered.map((c, i) => [c.id, SERIES[i % SERIES.length]])), [ordered]);
  const byId = useMemo(() => Object.fromEntries(ordered.map((c) => [c.id, c])), [ordered]);

  const [tab, setTab] = useState<Tab>("compare");
  const [kind, setKind] = useState("all");
  const [picked, setPicked] = useState<string[]>([]); // empty = all of the kind
  const [method, setMethod] = useState("all");
  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");
  const [q, setQ] = useState("");

  const kindCamps = ordered.filter((c) => kind === "all" || c.kind === kind);
  const active = picked.length ? kindCamps.filter((c) => picked.includes(c.id)) : kindCamps;
  const activeIds = new Set(active.map((c) => c.id));
  const methods = useMemo(() => [...new Set(gifts.map((g) => methodOf(g[8])))].sort(), [gifts]);

  const filtered = useMemo(() => {
    const lo = Number(minAmt) || 0, hi = Number(maxAmt) || Infinity, s = q.trim().toLowerCase();
    return gifts.filter((g) => activeIds.has(g[0]) && g[4] >= lo && g[4] <= hi && (method === "all" || methodOf(g[8]) === method) &&
      (!s || (g[1] + " " + g[2] + " " + g[3] + " " + g[6] + " " + g[7]).toLowerCase().includes(s)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gifts, active.map((c) => c.id).join(), method, minAmt, maxAmt, q]);

  const people = useMemo(() => buildPeople(filtered.map((g) => [g[0], g[1], g[2], g[3], g[4], g[5], g[6]] as G)), [filtered]);
  const allPeople = useMemo(() => buildPeople(gifts.map((g) => [g[0], g[1], g[2], g[3], g[4], g[5], g[6]] as G)), [gifts]);

  const stats = useMemo(() => {
    const out: Record<string, { raised: number; gifts: number; amounts: number[]; donors: number; newD: number; ret: number; retention: number | null; prevName: string; ambs: number; topAmb: string; topAmbAmt: number; largest: number; first: string; last: string }> = {};
    const seenBefore = new Map<string, number>(); // person key -> index of first campaign
    ordered.forEach((c, i) => {
      for (const p of allPeople) if (p.byCamp[c.id] && !seenBefore.has(p.key)) seenBefore.set(p.key, i);
    });
    for (const c of active) {
      const gs = filtered.filter((g) => g[0] === c.id);
      const amounts = gs.map((g) => g[4]);
      const donors = people.filter((p) => p.byCamp[c.id]);
      const idx = ordered.indexOf(c);
      const prev = [...ordered.slice(0, idx)].reverse().find((x) => x.kind === c.kind);
      let retention: number | null = null;
      if (prev) {
        const prevDonors = allPeople.filter((p) => p.byCamp[prev.id]);
        retention = prevDonors.length ? prevDonors.filter((p) => p.byCamp[c.id]).length / prevDonors.length : null;
      }
      const amb: Record<string, number> = {};
      gs.forEach((g) => { if (g[6]) amb[g[6]] = (amb[g[6]] || 0) + g[4]; });
      const top = Object.entries(amb).sort((a, b) => b[1] - a[1])[0];
      const dates = gs.map((g) => g[5]).sort();
      out[c.id] = {
        raised: amounts.reduce((s, a) => s + a, 0), gifts: gs.length, amounts, donors: donors.length,
        newD: donors.filter((p) => (seenBefore.get(p.key) ?? idx) >= idx).length,
        ret: donors.filter((p) => (seenBefore.get(p.key) ?? idx) < idx).length,
        retention, prevName: prev?.name || "", ambs: Object.keys(amb).length, topAmb: top?.[0] || "", topAmbAmt: top?.[1] || 0,
        largest: amounts.length ? Math.max(...amounts) : 0, first: dates[0] || "", last: dates[dates.length - 1] || "",
      };
    }
    return out;
  }, [active, filtered, people, allPeople, ordered]);

  const total = filtered.reduce((s, g) => s + g[4], 0);
  const amountsAll = filtered.map((g) => g[4]);
  const reset = () => { setKind("all"); setPicked([]); setMethod("all"); setMinAmt(""); setMaxAmt(""); setQ(""); };
  const filteredBy = kind !== "all" || picked.length || method !== "all" || minAmt || maxAmt || q;

  return (
    <div className="an">
      <div className="toolbar" style={{ marginBottom: 6 }}>
        <h1 className="section-h" style={{ margin: 0 }}>Analytics</h1>
        <span className="meta">{num(gifts.length)} gifts across {campaigns.length} campaigns, including imported history</span>
      </div>

      <div className="an-filters" role="group" aria-label="Filters">
        <div className="seg an-seg" role="group" aria-label="Campaign type">
          {[["all", "All"], ["hike", "Hike"], ["volleyball", "Volleyball"], ["other", "Other"]].filter(([k]) => k === "all" || ordered.some((c) => c.kind === k)).map(([k, l]) => (
            <button key={k} type="button" className="opt" aria-pressed={kind === k} onClick={() => { setKind(k); setPicked([]); }}>{l}</button>
          ))}
        </div>
        <select className="in" value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Payment method">
          <option value="all">All payment methods</option>
          {methods.map((m) => <option key={m}>{m}</option>)}
        </select>
        <input className="in num an-amt" inputMode="decimal" placeholder="Min $" value={minAmt} onChange={(e) => setMinAmt(e.target.value.replace(/[^\d.]/g, ""))} aria-label="Minimum gift" />
        <input className="in num an-amt" inputMode="decimal" placeholder="Max $" value={maxAmt} onChange={(e) => setMaxAmt(e.target.value.replace(/[^\d.]/g, ""))} aria-label="Maximum gift" />
        <input className="search" placeholder="Search donor, email, phone, ambassador, team" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
        {filteredBy ? <button type="button" className="btn ghost sm" onClick={reset}>Clear filters</button> : null}
      </div>
      <div className="an-chips" aria-label="Campaigns">
        {kindCamps.map((c) => {
          const on = activeIds.has(c.id);
          return (
            <button key={c.id} type="button" className="an-chip" aria-pressed={on} onClick={() => setPicked((p) => {
              const base = p.length ? p : kindCamps.map((x) => x.id);
              const next = base.includes(c.id) ? base.filter((x) => x !== c.id) : [...base, c.id];
              return next.length === kindCamps.length || !next.length ? [] : next;
            })}>
              <i style={{ background: on ? color[c.id] : "transparent", borderColor: color[c.id] }} />{c.name}
            </button>
          );
        })}
      </div>

      <div className="kpis num an-kpis">
        <Kpi label="Raised (before match)" value={fmt(total)} sub={`${active.length} campaign${active.length === 1 ? "" : "s"}`} />
        <Kpi label="Gifts" value={num(filtered.length)} sub={filtered.length ? `largest ${fmt(Math.max(...amountsAll))}` : "—"} />
        <Kpi label="Donors" value={num(people.length)} sub="matched by email, phone, name" />
        <Kpi label="Average gift" value={fmt(filtered.length ? total / filtered.length : 0)} sub={`median ${fmt(median(amountsAll))}`} />
        <Kpi label="Gave 2+ campaigns" value={num(people.filter((p) => Object.keys(p.byCamp).length > 1).length)} sub={people.length ? pct(people.filter((p) => Object.keys(p.byCamp).length > 1).length / people.length) + " of donors" : "—"} />
      </div>

      <div className="tabs" role="tablist" style={{ marginTop: 18 }}>
        {([["compare", "Compare campaigns"], ["donors", "Donors"], ["ambassadors", "Peer-to-peer"], ["followup", "Ambassador follow-up"], ["gifts", "Gifts & methods"]] as [Tab, string][]).map(([t, l]) => (
          <button key={t} role="tab" className="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {tab !== "followup" && !filtered.length ? <div className="donors"><div className="empty">No gifts match these filters.</div></div> :
        tab === "compare" ? <Compare active={active} stats={stats} color={color} filtered={filtered} /> :
        tab === "donors" ? <Donors people={people} active={active} color={color} /> :
        tab === "ambassadors" ? <Ambassadors filtered={filtered} active={active} color={color} /> :
        tab === "followup" ? <FollowUp gifts={gifts} people={allPeople} ordered={ordered} ambassadors={ambassadors} siteUrl={siteUrl} /> :
        <Gifts filtered={filtered} byId={byId} />}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div className="kpi"><span>{label}</span><b>{value}</b><small>{sub}</small></div>;
}

/* ---------------------------------------------------------------- compare */
type S = Record<string, { raised: number; gifts: number; amounts: number[]; donors: number; newD: number; ret: number; retention: number | null; prevName: string; ambs: number; topAmb: string; topAmbAmt: number; largest: number; first: string; last: string }>;
function Compare({ active, stats, color, filtered }: { active: ACampaign[]; stats: S; color: Record<string, string>; filtered: AGift[] }) {
  const [sort, setSort] = useState<[string, number]>(["", 1]);
  const rows = active.map((c) => ({ c, s: stats[c.id] })).filter((r) => r.s);
  const key: Record<string, (r: (typeof rows)[number]) => number | string> = {
    name: (r) => r.c.name, raised: (r) => r.s.raised, gifts: (r) => r.s.gifts, donors: (r) => r.s.donors, avg: (r) => (r.s.gifts ? r.s.raised / r.s.gifts : 0),
    median: (r) => median(r.s.amounts), largest: (r) => r.s.largest, newD: (r) => r.s.newD, ret: (r) => r.s.ret, retention: (r) => r.s.retention ?? -1, ambs: (r) => r.s.ambs,
  };
  if (sort[0]) rows.sort((a, b) => { const x = key[sort[0]](a), y = key[sort[0]](b); return (x > y ? 1 : x < y ? -1 : 0) * sort[1]; });
  const th = (k: string, l: string, r = true) => (
    <th className={r ? "r" : ""} aria-sort={sort[0] === k ? (sort[1] > 0 ? "ascending" : "descending") : "none"}>
      <button type="button" className="an-sort" onClick={() => setSort(([s, d]) => [k, s === k ? -d : -1])}>{l}{sort[0] === k ? (sort[1] > 0 ? " ↑" : " ↓") : ""}</button>
    </th>
  );
  return (
    <>
      <div className="an-grid">
        <section className="panel">
          <h2>Raised by campaign</h2>
          <BarChart items={rows.map((r) => ({ label: r.c.name, sub: r.c.year ? String(r.c.year) : "", value: r.s.raised, color: color[r.c.id], extra: `${num(r.s.gifts)} gifts · ${num(r.s.donors)} donors` }))} />
        </section>
        <section className="panel">
          <h2>Pace: money raised by day of campaign</h2>
          <p>Day 0 is each campaign&apos;s first gift. Shows how fast each campaign reached its total.</p>
          <PaceChart active={active} filtered={filtered} color={color} />
        </section>
      </div>
      <div className="tw" style={{ marginTop: 16 }}>
        <table>
          <thead><tr>{th("name", "Campaign", false)}{th("raised", "Raised")}{th("gifts", "Gifts")}{th("donors", "Donors")}{th("avg", "Avg gift")}{th("median", "Median")}{th("largest", "Largest")}{th("newD", "New donors")}{th("ret", "Returning")}{th("retention", "Kept from last")}{th("ambs", "Ambassadors")}<th>Top ambassador</th><th>Dates</th></tr></thead>
          <tbody>
            {rows.map(({ c, s }) => (
              <tr key={c.id}>
                <td><span className="an-dot" style={{ background: color[c.id] }} /><b>{c.name}</b> <span className={`pill ${c.status === "live" ? "ok" : c.status === "draft" ? "wait" : "off"}`}>{c.status}</span></td>
                <td className="r num"><b>{fmt(s.raised)}</b></td>
                <td className="r num">{num(s.gifts)}</td>
                <td className="r num">{num(s.donors)}</td>
                <td className="r num">{fmt(s.gifts ? s.raised / s.gifts : 0)}</td>
                <td className="r num">{fmt(median(s.amounts))}</td>
                <td className="r num">{fmt(s.largest)}</td>
                <td className="r num">{num(s.newD)}</td>
                <td className="r num">{num(s.ret)}</td>
                <td className="r num" title={s.prevName ? `Share of ${s.prevName} donors who gave again` : "First campaign of its kind"}>{s.retention == null ? "—" : pct(s.retention)}</td>
                <td className="r num">{num(s.ambs)}</td>
                <td>{s.topAmb ? <>{s.topAmb} <span className="meta num">{fmt(s.topAmbAmt)}</span></> : "—"}</td>
                <td className="meta num">{s.first ? `${s.first.slice(5)}${s.first !== s.last ? " – " + s.last.slice(5) : ""} ${s.first.slice(0, 4)}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="meta" style={{ marginTop: 8 }}>&ldquo;Kept from last&rdquo; is the share of the previous campaign of the same type whose donors gave again. Amounts are what donors gave, before matching.</p>
    </>
  );
}

function BarChart({ items }: { items: { label: string; sub: string; value: number; color: string; extra: string }[] }) {
  const [hover, setHover] = useState(-1);
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="an-bars" onMouseLeave={() => setHover(-1)}>
      {items.map((it, i) => (
        <div key={it.label} className="an-bar" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${it.label}: ${fmt(it.value)}, ${it.extra}`}>
          <div className="an-bar-l"><span className="an-dot" style={{ background: it.color }} />{it.label}</div>
          <div className="an-bar-t"><div className="an-bar-f" style={{ width: `${(it.value / max) * 100}%`, background: it.color, opacity: hover === -1 || hover === i ? 1 : 0.45 }} /></div>
          <div className="an-bar-v num">{short(it.value)}</div>
          {hover === i && <div className="an-tip num" role="status"><b>{it.label}</b><br />{fmt(it.value)} · {it.extra}</div>}
        </div>
      ))}
    </div>
  );
}

function PaceChart({ active, filtered, color }: { active: ACampaign[]; filtered: AGift[]; color: Record<string, string> }) {
  const [hx, setHx] = useState<number | null>(null);
  const series = active.map((c) => {
    const gs = filtered.filter((g) => g[0] === c.id && g[5]);
    if (!gs.length) return null;
    const d0 = Math.min(...gs.map((g) => day(g[5])));
    const per: Record<number, number> = {};
    gs.forEach((g) => { const d = day(g[5]) - d0; per[d] = (per[d] || 0) + g[4]; });
    const days = Math.max(...Object.keys(per).map(Number));
    const pts: number[] = []; let run = 0;
    for (let d = 0; d <= days; d++) { run += per[d] || 0; pts.push(run); }
    return { c, pts, singleDay: days === 0 };
  }).filter(Boolean) as { c: ACampaign; pts: number[]; singleDay: boolean }[];
  const lines = series.filter((s) => !s.singleDay);
  if (!lines.length) return <div className="empty">Not enough dated gifts to chart pace.</div>;
  const W = 640, H = 260, L = 52, R = 28, T = 10, B = 28;
  const maxX = Math.min(120, Math.max(...lines.map((s) => s.pts.length - 1)));
  const maxY = Math.max(...lines.map((s) => s.pts[Math.min(maxX, s.pts.length - 1)]));
  const x = (d: number) => L + (d / Math.max(1, maxX)) * (W - L - R);
  const y = (v: number) => T + (1 - v / (maxY || 1)) * (H - T - B);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);
  const xt = Array.from({ length: 5 }, (_, i) => Math.round((i / 4) * maxX));
  const at = (s: { pts: number[] }, d: number) => s.pts[Math.min(d, s.pts.length - 1)];
  return (
    <div className="an-pace">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cumulative money raised by day for each campaign"
        onMouseMove={(e) => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setHx(Math.max(0, Math.min(maxX, Math.round(((px - L) / (W - L - R)) * maxX)))); }}
        onMouseLeave={() => setHx(null)}>
        {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="an-grid-l" /><text x={L - 6} y={y(t) + 4} textAnchor="end" className="an-ax">{short(t)}</text></g>)}
        {xt.map((t) => <text key={t} x={x(t)} y={H - 8} textAnchor="middle" className="an-ax">day {t}</text>)}
        {lines.map((s) => (
          <polyline key={s.c.id} fill="none" stroke={color[s.c.id]} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"
            points={s.pts.slice(0, maxX + 1).map((v, d) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(" ")} />
        ))}
        {hx != null && <>
          <line x1={x(hx)} x2={x(hx)} y1={T} y2={H - B} className="an-cross" />
          {lines.map((s) => <circle key={s.c.id} cx={x(hx)} cy={y(at(s, hx))} r={4} fill={color[s.c.id]} stroke="var(--surface)" strokeWidth={2} />)}
        </>}
      </svg>
      {hx != null && (
        <div className="an-tip an-tip-pace num" role="status">
          <b>Day {hx}</b>
          {[...lines].sort((a, b) => at(b, hx) - at(a, hx)).map((s) => <div key={s.c.id}><span className="an-dot" style={{ background: color[s.c.id] }} />{s.c.name}: {fmt(at(s, hx))}</div>)}
        </div>
      )}
      <div className="an-legend">
        {lines.map((s) => <span key={s.c.id}><span className="an-dot" style={{ background: color[s.c.id] }} />{s.c.name}</span>)}
      </div>
      {series.some((s) => s.singleDay) && <p className="meta">Not shown: {series.filter((s) => s.singleDay).map((s) => s.c.name).join(", ")} (all gifts carry one date in the export).</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- donors */
function Donors({ people, active, color }: { people: ReturnType<typeof buildPeople>; active: ACampaign[]; color: Record<string, string> }) {
  const [gave, setGave] = useState("");
  const [notGave, setNotGave] = useState("");
  const [minCamps, setMinCamps] = useState(1);
  const [sort, setSort] = useState<[string, number]>(["lifetime", -1]);
  const [limit, setLimit] = useState(100);
  let rows = people.filter((p) => (!gave || p.byCamp[gave]) && (!notGave || !p.byCamp[notGave]) && Object.keys(p.byCamp).length >= minCamps);
  const get = (p: (typeof rows)[number], k: string): number | string => k === "name" ? p.name : k === "lifetime" ? p.lifetime : k === "camps" ? Object.keys(p.byCamp).length : k === "last" ? p.last?.date || "" : p.byCamp[k] || 0;
  rows = [...rows].sort((a, b) => { const x = get(a, sort[0]), y = get(b, sort[0]); return (x > y ? 1 : x < y ? -1 : 0) * sort[1]; });
  const th = (k: string, l: React.ReactNode, r = true) => (
    <th className={r ? "r" : ""} aria-sort={sort[0] === k ? (sort[1] > 0 ? "ascending" : "descending") : "none"}>
      <button type="button" className="an-sort" onClick={() => setSort(([s, d]) => [k, s === k ? -d : -1])}>{l}{sort[0] === k ? (sort[1] > 0 ? " ↑" : " ↓") : ""}</button>
    </th>
  );
  const csv = () => {
    const qv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Name", "Email", "Phone", "Lifetime", "Campaigns", ...active.map((c) => c.name), "Last gift", "Ambassador"].map(qv).join(",")]
      .concat(rows.map((p) => [p.name, p.email, p.phone, p.lifetime, Object.keys(p.byCamp).length, ...active.map((c) => p.byCamp[c.id] || ""), p.last?.date, p.amb].map(qv).join(",")));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    a.download = "donors.csv"; a.click(); URL.revokeObjectURL(a.href);
  };
  return (
    <>
      <div className="toolbar">
        <div className="an-filters" style={{ margin: 0 }}>
          <select className="in" value={gave} onChange={(e) => setGave(e.target.value)} aria-label="Gave to"><option value="">Gave to: any campaign</option>{active.map((c) => <option key={c.id} value={c.id}>Gave to {c.name}</option>)}</select>
          <select className="in" value={notGave} onChange={(e) => setNotGave(e.target.value)} aria-label="Did not give to"><option value="">Didn&apos;t give to: —</option>{active.map((c) => <option key={c.id} value={c.id}>Didn&apos;t give to {c.name}</option>)}</select>
          <select className="in" value={minCamps} onChange={(e) => setMinCamps(Number(e.target.value))} aria-label="Minimum campaigns"><option value={1}>Any number of campaigns</option><option value={2}>Gave to 2+ campaigns</option><option value={3}>Gave to 3+</option><option value={4}>Gave to 4+</option></select>
        </div>
        <button type="button" className="btn ghost" onClick={csv}>Download CSV ({num(rows.length)})</button>
      </div>
      <p className="meta" style={{ margin: "0 0 8px" }}>{num(rows.length)} people · {fmt(rows.reduce((s, p) => s + p.lifetime, 0))} lifetime. Tip: &ldquo;Gave to Hike 2026&rdquo; + &ldquo;Didn&apos;t give to Hike 2027&rdquo; is your follow-up list.</p>
      <div className="tw">
        <table>
          <thead><tr>{th("name", "Donor", false)}<th>Contact</th>{th("lifetime", "Lifetime")}{th("camps", "Camp.")}{active.map((c) => th(c.id, <><span className="an-dot" style={{ background: color[c.id] }} />{c.year || c.name.slice(0, 10)}{c.kind === "hike" ? " H" : c.kind === "volleyball" ? " V" : ""}</>))}{th("last", "Last gift")}<th>Ambassador</th></tr></thead>
          <tbody>
            {rows.slice(0, limit).map((p) => (
              <tr key={p.key}>
                <td><b>{p.name}</b></td>
                <td className="meta">{p.email || p.phone || "—"}{p.email && p.phone ? <><br />{p.phone}</> : null}</td>
                <td className="r num"><b>{fmt(p.lifetime)}</b></td>
                <td className="r num">{Object.keys(p.byCamp).length}</td>
                {active.map((c) => <td key={c.id} className="r num">{p.byCamp[c.id] ? fmt(p.byCamp[c.id]) : <span className="an-none">—</span>}</td>)}
                <td className="meta num">{p.last?.date || "—"}</td>
                <td className="meta">{p.amb || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit && <button type="button" className="btn ghost" style={{ marginTop: 12 }} onClick={() => setLimit((l) => l + 200)}>Show more ({num(rows.length - limit)} left)</button>}
      <p className="meta" style={{ marginTop: 8 }}>Column headers: H = Hike, V = Volleyball. Click any header to sort.</p>
    </>
  );
}

/* ---------------------------------------------------------------- peer-to-peer */
function Ambassadors({ filtered, active, color }: { filtered: AGift[]; active: ACampaign[]; color: Record<string, string> }) {
  const [sort, setSort] = useState<[string, number]>(["total", -1]);
  const [q, setQ] = useState("");
  // Per campaign: how much came through ambassadors (peer-to-peer) vs. directly.
  const perCamp = active.map((c) => {
    const gs = filtered.filter((g) => g[0] === c.id);
    const tot = gs.reduce((s, g) => s + g[4], 0);
    const by: Record<string, number> = {};
    gs.forEach((g) => { if (g[6]) { const k = g[6].trim().toLowerCase(); by[k] = (by[k] || 0) + g[4]; } });
    const vals = Object.values(by).sort((a, b) => b - a);
    const p2p = vals.reduce((s, v) => s + v, 0);
    const top10 = vals.slice(0, Math.max(1, Math.ceil(vals.length * 0.1))).reduce((s, v) => s + v, 0);
    return { c, tot, p2p, n: vals.length, avg: vals.length ? p2p / vals.length : 0, med: median(vals), top10: p2p ? top10 / p2p : 0, best: vals[0] || 0, over1k: vals.filter((v) => v >= 1000).length };
  });
  // Per ambassador across campaigns.
  const map = new Map<string, { name: string; total: number; gifts: number; donors: Set<string>; by: Record<string, number>; teams: Set<string> }>();
  for (const g of filtered) {
    if (!g[6]) continue;
    const k = g[6].trim().toLowerCase();
    const a = map.get(k) || { name: g[6].trim(), total: 0, gifts: 0, donors: new Set<string>(), by: {}, teams: new Set<string>() };
    a.total += g[4]; a.gifts++; a.by[g[0]] = (a.by[g[0]] || 0) + g[4]; a.donors.add(g[2] || g[3] || normName(g[1])); if (g[7]) a.teams.add(g[7]);
    map.set(k, a);
  }
  const lastTwo = active.slice(-2);
  const change = (a: { by: Record<string, number> }) => lastTwo.length === 2 && a.by[lastTwo[0].id] ? ((a.by[lastTwo[1].id] || 0) - a.by[lastTwo[0].id]) / a.by[lastTwo[0].id] : null;
  type A = typeof map extends Map<string, infer V> ? V : never;
  const get = (a: A, k: string): number | string => k === "name" ? a.name : k === "total" ? a.total : k === "gifts" ? a.gifts : k === "donors" ? a.donors.size : k === "camps" ? Object.keys(a.by).length : k === "change" ? (change(a) ?? -99) : a.by[k] || 0;
  const s = q.trim().toLowerCase();
  const rows = [...map.values()].filter((a) => !s || a.name.toLowerCase().includes(s) || [...a.teams].join(" ").toLowerCase().includes(s))
    .sort((a, b) => { const x = get(a, sort[0]), y = get(b, sort[0]); return (x > y ? 1 : x < y ? -1 : 0) * sort[1]; });
  const th = (k: string, l: React.ReactNode, r = true) => (
    <th className={r ? "r" : ""} aria-sort={sort[0] === k ? (sort[1] > 0 ? "ascending" : "descending") : "none"}><button type="button" className="an-sort" onClick={() => setSort(([x, d]) => [k, x === k ? -d : -1])}>{l}{sort[0] === k ? (sort[1] > 0 ? " ↑" : " ↓") : ""}</button></th>
  );
  const label = (c: ACampaign) => (c.year ? `${c.kind === "volleyball" ? "Volley" : c.kind === "hike" ? "Hike" : "Camp."} ${c.year}` : c.name.slice(0, 18));
  return (
    <>
      <div className="an-grid">
        <section className="panel">
          <h2>Raised through ambassadors</h2>
          <p>Share of each campaign that came in through an ambassador&apos;s page (peer-to-peer) versus directly.</p>
          <div className="an-bars">
            {perCamp.map((r) => (
              <div key={r.c.id} className="an-bar" title={`${r.c.name}: ${fmt(r.p2p)} of ${fmt(r.tot)} through ${r.n} ambassadors`}>
                <div className="an-bar-l"><span className="an-dot" style={{ background: color[r.c.id] }} />{r.c.name}</div>
                <div className="an-bar-t"><div className="an-bar-f" style={{ width: pct(r.tot ? r.p2p / r.tot : 0), background: color[r.c.id] }} /></div>
                <div className="an-bar-v num">{pct(r.tot ? r.p2p / r.tot : 0)}</div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <h2>Ambassador strength by campaign</h2>
          <div className="tw"><table>
            <thead><tr><th>Campaign</th><th className="r">Ambassadors</th><th className="r">Average</th><th className="r">Median</th><th className="r">Best</th><th className="r">$1k+</th><th className="r">Top 10% share</th></tr></thead>
            <tbody>{perCamp.map((r) => (
              <tr key={r.c.id}><td><span className="an-dot" style={{ background: color[r.c.id] }} />{label(r.c)}</td><td className="r num">{num(r.n)}</td><td className="r num">{fmt(r.avg)}</td><td className="r num">{fmt(r.med)}</td><td className="r num">{fmt(r.best)}</td><td className="r num">{num(r.over1k)}</td><td className="r num">{pct(r.top10)}</td></tr>
            ))}</tbody>
          </table></div>
          <p className="meta">&ldquo;Top 10% share&rdquo;: how much of the peer-to-peer money the best tenth of ambassadors brought in.</p>
        </section>
      </div>
      <div className="toolbar" style={{ marginTop: 16 }}>
        <input className="search" placeholder="Search ambassador or team" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search ambassadors" />
        <span className="meta">{num(rows.length)} ambassadors · {fmt(rows.reduce((t, a) => t + a.total, 0))}{lastTwo.length === 2 ? ` · change compares ${label(lastTwo[1])} with ${label(lastTwo[0])}` : ""}</span>
      </div>
      <div className="tw">
        <table>
          <thead><tr>{th("name", "Ambassador", false)}<th>Team</th>{th("total", "Total")}{th("donors", "Donors")}{th("camps", "Camp.")}{active.map((c) => th(c.id, <><span className="an-dot" style={{ background: color[c.id] }} />{label(c)}</>))}{lastTwo.length === 2 && th("change", "Change")}</tr></thead>
          <tbody>
            {rows.slice(0, 400).map((a) => {
              const ch = change(a);
              return (
                <tr key={a.name}>
                  <td><b>{a.name}</b></td>
                  <td className="meta">{[...a.teams].join(", ") || "—"}</td>
                  <td className="r num"><b>{fmt(a.total)}</b></td>
                  <td className="r num">{num(a.donors.size)}</td>
                  <td className="r num">{Object.keys(a.by).length}</td>
                  {active.map((c) => <td key={c.id} className="r num">{a.by[c.id] ? fmt(a.by[c.id]) : <span className="an-none">—</span>}</td>)}
                  {lastTwo.length === 2 && <td className="r num">{ch == null ? <span className="an-none">—</span> : <span className={ch >= 0 ? "an-up" : "an-down"}>{ch >= 0 ? "▲" : "▼"} {pct(Math.abs(ch))}</span>}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- ambassador follow-up */
type Person = ReturnType<typeof buildPeople>[number];
function FollowUp({ gifts, people, ordered, ambassadors, siteUrl }: { gifts: AGift[]; people: Person[]; ordered: ACampaign[]; ambassadors: AAmb[]; siteUrl: string }) {
  const latest = ordered[ordered.length - 1];
  const prevOf = (c?: ACampaign) => (c ? [...ordered.slice(0, ordered.indexOf(c))].reverse().find((x) => x.kind === c.kind) : undefined);
  const [toId, setToId] = useState(latest?.id || "");
  const to = ordered.find((c) => c.id === toId);
  const [fromId, setFromId] = useState(prevOf(latest)?.id || "");
  const from = ordered.find((c) => c.id === fromId);
  const [open, setOpen] = useState("");
  const [copied, setCopied] = useState("");

  // Find the person behind a gift the same way the donor list does: email, then phone, then full name.
  const idx = useMemo(() => {
    const e = new Map<string, Person>(), p = new Map<string, Person>(), n = new Map<string, Person>();
    for (const x of people) { if (x.email) e.set(x.email, x); if (x.phone) p.set(x.phone, x); if (x.name) n.set(normName(x.name), x); }
    return (g: AGift) => (g[2] && e.get(g[2])) || (g[3] && p.get(g[3])) || n.get(normName(g[1]));
  }, [people]);
  const contact = useMemo(() => new Map(ambassadors.map((a) => [normName(a.name), a])), [ambassadors]);

  const lists = useMemo(() => {
    if (!from || !to) return [];
    const out = new Map<string, { name: string; owed: Map<string, { p: Person; amount: number }>; raised: number }>();
    for (const g of gifts) {
      if (g[0] !== from.id || !g[6]) continue;
      const k = normName(g[6]);
      const o = out.get(k) || { name: g[6].trim(), owed: new Map(), raised: 0 };
      o.raised += g[4];
      const p = idx(g);
      if (p && !p.byCamp[to.id] && normName(p.name) !== "anonymous") {
        const cur = o.owed.get(p.key);
        o.owed.set(p.key, { p, amount: (cur?.amount || 0) + g[4] });
      }
      out.set(k, o);
    }
    return [...out.values()].filter((o) => o.owed.size).sort((a, b) => b.owed.size - a.owed.size || b.raised - a.raised);
  }, [gifts, from, to, idx]);

  if (!to || !from) return <div className="donors"><div className="empty">Pick two campaigns to compare.</div></div>;
  const link = siteUrl && to ? `${siteUrl}/${to.slug}` : "";
  const message = (o: (typeof lists)[number]) => {
    const names = [...o.owed.values()].sort((a, b) => b.amount - a.amount).map(({ p, amount }) => `• ${p.name} (${fmt(amount)}${p.phone ? ", " + p.phone : ""})`);
    return `Hi ${firstOf(o.name)}! Thank you for raising ${fmt(o.raised)} for ${from.name}. These people gave through you last time and haven't given to ${to.name} yet:\n${names.join("\n")}\n\nA personal message from you makes all the difference.${link ? " Here's the link: " + link : ""}`;
  };
  const copy = async (k: string, text: string) => { try { await navigator.clipboard.writeText(text); setCopied(k); setTimeout(() => setCopied(""), 2000); } catch { setCopied(""); } };
  const totalPeople = lists.reduce((s, o) => s + o.owed.size, 0);

  return (
    <>
      <div className="note-box" style={{ marginBottom: 12 }}>
        Each ambassador gets the list of people who gave through <b>them</b> in one campaign and haven&apos;t given to the other yet. Send it with one tap by text or email, or copy it.
      </div>
      <div className="an-filters">
        <label className="meta">Their donors from
          <select className="in" style={{ marginLeft: 8 }} value={fromId} onChange={(e) => setFromId(e.target.value)}>{ordered.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </label>
        <label className="meta">who haven&apos;t given to
          <select className="in" style={{ marginLeft: 8 }} value={toId} onChange={(e) => { setToId(e.target.value); const c = ordered.find((x) => x.id === e.target.value); const p = prevOf(c); if (p) setFromId(p.id); }}>{ordered.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </label>
      </div>
      <p className="meta" style={{ margin: "0 0 8px" }}>{num(lists.length)} ambassadors have {num(totalPeople)} donors to follow up with.</p>
      {!lists.length ? <div className="donors"><div className="empty">Nobody to follow up with for this pair: every ambassador&apos;s donors have already given (or no ambassador data).</div></div> : (
        <div className="tw"><table>
          <thead><tr><th>Ambassador</th><th className="r">Raised in {from.year || "first"}</th><th className="r">Not yet given</th><th>Contact</th><th>Send their list</th></tr></thead>
          <tbody>
            {lists.map((o) => {
              const c = contact.get(normName(o.name));
              const text = message(o);
              const k = normName(o.name);
              return [
                <tr key={k}>
                  <td><b>{o.name}</b></td>
                  <td className="r num">{fmt(o.raised)}</td>
                  <td className="r num"><b>{num(o.owed.size)}</b></td>
                  <td className="meta">{c?.phone || c?.email || <span title="This ambassador hasn't signed up for the new campaign yet, so there's no phone or email on file.">not on file</span>}</td>
                  <td><span className="acts">
                    {c?.phone && <a className="btn sm" href={`sms:${c.phone}?&body=${encodeURIComponent(text)}`}>Text</a>}
                    {c?.email && <a className="btn ghost sm" href={`mailto:${c.email}?subject=${encodeURIComponent(`Your donors for ${to.name}`)}&body=${encodeURIComponent(text)}`}>Email</a>}
                    <button type="button" className="btn ghost sm" onClick={() => copy(k, text)}>{copied === k ? "Copied" : "Copy"}</button>
                    <button type="button" className="btn ghost sm" aria-expanded={open === k} onClick={() => setOpen(open === k ? "" : k)}>{open === k ? "Hide" : "View"}</button>
                  </span></td>
                </tr>,
                open === k && (
                  <tr key={k + "-list"}><td colSpan={5} style={{ background: "var(--sunk)" }}>
                    <div className="tw"><table>
                      <thead><tr><th>Donor</th><th className="r">Gave in {from.year || "first"}</th><th>Phone</th><th>Email</th><th className="r">Lifetime</th></tr></thead>
                      <tbody>{[...o.owed.values()].sort((a, b) => b.amount - a.amount).map(({ p, amount }) => (
                        <tr key={p.key}><td>{p.name}</td><td className="r num">{fmt(amount)}</td><td className="num">{p.phone ? <a href={`sms:${p.phone}`}>{p.phone}</a> : "—"}</td><td>{p.email || "—"}</td><td className="r num">{fmt(p.lifetime)}</td></tr>
                      ))}</tbody>
                    </table></div>
                  </td></tr>
                ),
              ];
            })}
          </tbody>
        </table></div>
      )}
      <p className="meta" style={{ marginTop: 8 }}>Phone and email come from ambassadors who signed up on this site. Ambassadors from imported years show &ldquo;not on file&rdquo; until they sign up again; you can still Copy their list and send it yourself.</p>
    </>
  );
}

/* ---------------------------------------------------------------- gifts */
function Gifts({ filtered, byId }: { filtered: AGift[]; byId: Record<string, ACampaign> }) {
  const total = filtered.reduce((s, g) => s + g[4], 0);
  const buckets = BUCKETS.map(([l, lo, hi]) => { const gs = filtered.filter((g) => g[4] >= lo && g[4] < hi); return { label: l, n: gs.length, sum: gs.reduce((s, g) => s + g[4], 0) }; });
  const maxN = Math.max(1, ...buckets.map((b) => b.n));
  const m = new Map<string, { n: number; sum: number }>();
  filtered.forEach((g) => { const k = methodOf(g[8]); const v = m.get(k) || { n: 0, sum: 0 }; v.n++; v.sum += g[4]; m.set(k, v); });
  const methods = [...m.entries()].sort((a, b) => b[1].sum - a[1].sum);
  const top = [...filtered].sort((a, b) => b[4] - a[4]).slice(0, 25);
  const [hover, setHover] = useState(-1);
  return (
    <div className="an-grid">
      <section className="panel">
        <h2>Gift sizes</h2>
        <p>How many gifts fell in each range, and how much they added up to.</p>
        <div className="an-hist" onMouseLeave={() => setHover(-1)}>
          {buckets.map((b, i) => (
            <div key={b.label} className="an-hcol" onMouseEnter={() => setHover(i)} tabIndex={0} onFocus={() => setHover(i)} aria-label={`${b.label}: ${b.n} gifts, ${fmt(b.sum)}`}>
              <div className="an-hval num">{num(b.n)}</div>
              <div className="an-hbar" style={{ height: `${(b.n / maxN) * 100}%`, opacity: hover === -1 || hover === i ? 1 : 0.45 }} />
              <div className="an-hlab">{b.label}</div>
              {hover === i && <div className="an-tip num"><b>{b.label}</b><br />{num(b.n)} gifts · {fmt(b.sum)} · {pct(b.sum / total)} of money</div>}
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Payment methods</h2>
        <div className="tw"><table>
          <thead><tr><th>Method</th><th className="r">Gifts</th><th className="r">Amount</th><th className="r">Share</th></tr></thead>
          <tbody>{methods.map(([k, v]) => <tr key={k}><td>{k}</td><td className="r num">{num(v.n)}</td><td className="r num">{fmt(v.sum)}</td><td className="r num"><span className="an-share"><i style={{ width: pct(v.sum / total) }} /></span>{pct(v.sum / total)}</td></tr>)}</tbody>
        </table></div>
      </section>
      <section className="panel" style={{ gridColumn: "1 / -1" }}>
        <h2>Largest gifts</h2>
        <div className="tw"><table>
          <thead><tr><th>Donor</th><th>Campaign</th><th className="r">Amount</th><th>Method</th><th>Ambassador</th><th>Date</th></tr></thead>
          <tbody>{top.map((g, i) => <tr key={i}><td><b>{g[1] || "Anonymous"}</b></td><td>{byId[g[0]]?.name}</td><td className="r num"><b>{fmt(g[4])}</b></td><td>{methodOf(g[8])}</td><td className="meta">{g[6] || "—"}</td><td className="meta num">{g[5]}</td></tr>)}</tbody>
        </table></div>
      </section>
    </div>
  );
}
