"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buildPeople, normName, firstOf, type G } from "@/lib/people";

export type DCampaign = { id: string; name: string; slug: string; kind: string; year: number | null; status: string; goal: number | null; match: number; matchCap: number | null; endsAt: string | null };
// id, timestamp, name, email, phone, amount, method, ambassadorId, ambassadorName, teamId, teamName, plan, status, anonymous, dedication
export type DGift = [string, string, string, string, string, number, string, string, string, string, string, string, string, boolean, string];
// timestamp (YYYY-MM-DD or ISO), name, email, phone, amount, ambassadorName
export type DPrev = [string, string, string, string, number, string];
export type DAmb = { id: string; name: string; slug: string; goal: number | null; phone: string; email: string; status: string; teamId: string; created: string };
export type DTeam = { id: string; name: string; slug: string; goal: number | null };
export type DStart = { ts: string; name: string; email: string; phone: string; amount: number; ambassadorId: string; method: string; completed: boolean };

const fmt = (n: number, c = false) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: c ? 2 : 0, minimumFractionDigits: c ? 2 : 0 }).format(n || 0);
const num = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n || 0));
const pct = (n: number) => (isFinite(n) ? Math.round(n * 100) + "%" : "—");
const short = (n: number) => (n >= 1e6 ? "$" + (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? "$" + Math.round(n / 1e3) + "k" : "$" + Math.round(n));
const ago = (iso: string) => { const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 6e4)); return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`; };
const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const hourOf = (iso: string) => Number(new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false })) % 24;
const METHOD: Record<string, string> = { card: "Card", apple_pay: "Apple/Google Pay", google_pay: "Apple/Google Pay", ach: "Bank", daf: "DAF", check: "Check", cash: "Cash", zelle: "Zelle", wire: "Wire", other: "Other" };
const PAGE = 30;

export default function CampaignDashboard({ campaign: c, prev, gifts, prevGifts, ambassadors, teams, starts, siteUrl }: {
  campaign: DCampaign; prev: { id: string; name: string } | null; gifts: DGift[]; prevGifts: DPrev[]; ambassadors: DAmb[]; teams: DTeam[]; starts: DStart[]; siteUrl: string;
}) {
  const router = useRouter();
  const [auto, setAuto] = useState(c.status === "live");
  const [stamp, setStamp] = useState(() => new Date());
  useEffect(() => { if (!auto) return; const t = setInterval(() => { router.refresh(); setStamp(new Date()); }, 60000); return () => clearInterval(t); }, [auto, router]);
  useEffect(() => { setStamp(new Date()); }, [gifts.length]);

  const ok = gifts.filter((g) => g[12] === "succeeded");
  const raised = ok.reduce((s, g) => s + g[5], 0);
  const matched = c.match > 1 ? Math.min(raised * (c.match - 1), c.matchCap ?? Infinity) : 0;
  const total = raised + matched;
  const factor = raised ? total / raised : 1;
  const dayAgo = Date.now() - 864e5;
  const last24 = ok.filter((g) => new Date(g[1]).getTime() > dayAgo);

  // People: this campaign vs. previous campaign of the same kind.
  const peopleNow = useMemo(() => buildPeople(ok.map((g) => ["now", g[2], g[3], g[4], g[5], g[1].slice(0, 10), g[8]] as G)), [ok]);
  const both = useMemo(() => buildPeople([
    ...ok.map((g) => ["now", g[2], g[3], g[4], g[5], g[1].slice(0, 10), g[8]] as G),
    ...prevGifts.map((g) => ["prev", g[1], g[2], g[3], g[4], g[0].slice(0, 10), g[5]] as G),
  ]), [ok, prevGifts]);
  const prevDonors = both.filter((p) => p.byCamp.prev);
  const lapsed = prevDonors.filter((p) => !p.byCamp.now && normName(p.name) !== "anonymous").sort((a, b) => b.byCamp.prev - a.byCamp.prev);
  const returning = prevDonors.filter((p) => p.byCamp.now);
  const newDonors = peopleNow.length - returning.length;

  // Pace vs. last year: cumulative by day since each campaign's first gift.
  const pace = (rows: { ts: string; amt: number }[]) => {
    if (!rows.length) return [] as number[];
    const d0 = Math.min(...rows.map((r) => new Date(r.ts.length === 10 ? r.ts + "T12:00:00Z" : r.ts).getTime()));
    const per: number[] = [];
    rows.forEach((r) => { const d = Math.floor((new Date(r.ts.length === 10 ? r.ts + "T12:00:00Z" : r.ts).getTime() - d0) / 864e5); per[d] = (per[d] || 0) + r.amt; });
    let run = 0; return Array.from({ length: per.length }, (_, i) => (run += per[i] || 0));
  };
  const paceNow = pace(ok.map((g) => ({ ts: g[1], amt: g[5] })));
  const pacePrev = pace(prevGifts.map((g) => ({ ts: g[0], amt: g[4] })));
  const dayN = paceNow.length - 1;
  const prevAtSameDay = pacePrev.length ? pacePrev[Math.min(dayN, pacePrev.length - 1)] : 0;

  // Ambassador command center.
  const prevByAmb = useMemo(() => { const m = new Map<string, number>(); prevGifts.forEach((g) => { if (g[5]) m.set(normName(g[5]), (m.get(normName(g[5])) || 0) + g[4]); }); return m; }, [prevGifts]);
  const lapsedByAmb = useMemo(() => {
    const m = new Map<string, typeof lapsed>();
    const idx = new Map<string, (typeof lapsed)[number]>();
    lapsed.forEach((p) => { if (p.email) idx.set("e" + p.email, p); if (p.phone) idx.set("p" + p.phone, p); idx.set("n" + normName(p.name), p); });
    const seen = new Set<string>();
    prevGifts.forEach((g) => {
      if (!g[5]) return;
      const p = (g[2] && idx.get("e" + g[2])) || (g[3] && idx.get("p" + g[3])) || idx.get("n" + normName(g[1]));
      if (!p) return;
      const k = normName(g[5]); const sk = k + "|" + p.key; if (seen.has(sk)) return; seen.add(sk);
      (m.get(k) || m.set(k, []).get(k)!).push(p);
    });
    return m;
  }, [lapsed, prevGifts]);
  const ambRows = ambassadors.map((a) => {
    const gs = ok.filter((g) => g[7] === a.id);
    const r = gs.reduce((s, g) => s + g[5], 0) * factor;
    const last = gs.map((g) => g[1]).sort().pop() || "";
    const before = prevByAmb.get(normName(a.name)) || 0;
    return { a, raised: r, donors: new Set(gs.map((g) => g[3] || g[4] || normName(g[2]))).size, last, before, toGoal: a.goal ? r / a.goal : null, gap: a.goal ? Math.max(0, a.goal - r) : null, lapsed: lapsedByAmb.get(normName(a.name)) || [], team: teams.find((t) => t.id === a.teamId)?.name || "" };
  });
  const [aSort, setASort] = useState<[string, number]>(["raised", -1]);
  const [aPage, setAPage] = useState(0);
  const [aQ, setAQ] = useState("");
  const [aFilter, setAFilter] = useState("all");
  const aKey: Record<string, (r: (typeof ambRows)[number]) => number | string> = { name: (r) => r.a.name, team: (r) => r.team, goal: (r) => r.a.goal || 0, raised: (r) => r.raised, toGoal: (r) => r.toGoal ?? -1, gap: (r) => r.gap ?? -1, donors: (r) => r.donors, last: (r) => r.last, before: (r) => r.before, change: (r) => (r.before ? r.raised / r.before : -1), lapsed: (r) => r.lapsed.length };
  const aList = ambRows
    .filter((r) => (!aQ || (r.a.name + " " + r.team).toLowerCase().includes(aQ.toLowerCase())) && (aFilter === "all" || (aFilter === "zero" && !r.raised) || (aFilter === "under" && r.toGoal != null && r.toGoal < 0.5) || (aFilter === "hit" && r.toGoal != null && r.toGoal >= 1) || (aFilter === "pending" && r.a.status === "pending") || (aFilter === "quiet" && r.raised > 0 && Date.now() - new Date(r.last).getTime() > 2 * 864e5)))
    .sort((x, y) => { const p = aKey[aSort[0]](x), q = aKey[aSort[0]](y); return (p > q ? 1 : p < q ? -1 : 0) * aSort[1]; });
  const ath = (k: string, l: string, r = true) => <th className={r ? "r" : ""} aria-sort={aSort[0] === k ? (aSort[1] > 0 ? "ascending" : "descending") : "none"}><button type="button" className="an-sort" onClick={() => { setASort(([s, d]) => [k, s === k ? -d : -1]); setAPage(0); }}>{l}{aSort[0] === k ? (aSort[1] > 0 ? " ↑" : " ↓") : ""}</button></th>;
  const listMsg = (r: (typeof ambRows)[number]) => `Hi ${firstOf(r.a.name)}! These people gave through you for ${prev?.name || "last year"} and haven't given to ${c.name} yet:\n${r.lapsed.slice(0, 40).map((p) => `• ${p.name} (${fmt(p.byCamp.prev)}${p.phone ? ", " + p.phone : ""})`).join("\n")}${r.lapsed.length > 40 ? `\n…and ${r.lapsed.length - 40} more` : ""}\n\nYour page: ${siteUrl}/${c.slug}/${r.a.slug}`;
  const nudgeMsg = (r: (typeof ambRows)[number]) => `Hi ${firstOf(r.a.name)}! You're at ${fmt(r.raised)}${r.a.goal ? ` of your ${fmt(r.a.goal)} goal` : ""} for ${c.name}. Keep going! Share your page: ${siteUrl}/${c.slug}/${r.a.slug}`;

  // Teams.
  const teamRows = teams.map((t) => {
    const gs = ok.filter((g) => g[9] === t.id || (g[7] && ambassadors.find((a) => a.id === g[7])?.teamId === t.id));
    const r = gs.reduce((s, g) => s + g[5], 0) * factor;
    return { t, raised: r, gifts: gs.length, members: ambassadors.filter((a) => a.teamId === t.id).length };
  }).sort((a, b) => b.raised - a.raised);

  // Abandoned: started, not finished, no later gift by the same email, older than 30 minutes.
  const abandoned = starts.filter((s) => !s.completed && Date.now() - new Date(s.ts).getTime() > 30 * 6e4 && !ok.some((g) => g[3] && g[3] === s.email && g[1] >= s.ts));
  // Recurring.
  const plans = useMemo(() => {
    const m = new Map<string, { name: string; email: string; plan: string; amount: number; payments: number; first: string; last: string }>();
    gifts.filter((g) => g[11] && g[12] === "succeeded").forEach((g) => {
      const k = (g[3] || g[2]) + "|" + g[11];
      const x = m.get(k) || { name: g[2], email: g[3], plan: g[11], amount: g[5], payments: 0, first: g[1], last: g[1] };
      x.payments++; if (g[1] > x.last) x.last = g[1]; if (g[1] < x.first) x.first = g[1];
      m.set(k, x);
    });
    return [...m.values()].map((p) => {
      const days = (Date.now() - new Date(p.last).getTime()) / 864e5;
      const inst = p.plan.startsWith("installments:");
      return { ...p, label: inst ? `${p.plan.split(":")[1]} monthly payments` : "Monthly, ongoing", state: inst ? "Pledged" : days > 45 ? "Lapsed" : days > 33 ? "Due" : "Active" };
    }).sort((a, b) => a.state.localeCompare(b.state));
  }, [gifts]);

  // Charts data.
  const byDay = useMemo(() => { const m = new Map<string, number>(); ok.forEach((g) => m.set(dayKey(g[1]), (m.get(dayKey(g[1])) || 0) + g[5])); return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-30); }, [ok]);
  const byHour = useMemo(() => { const h = Array(24).fill(0); ok.forEach((g) => { h[hourOf(g[1])] += g[5]; }); return h as number[]; }, [ok]);
  const byMethod = useMemo(() => { const m = new Map<string, number>(); ok.forEach((g) => m.set(METHOD[g[6]] || g[6] || "Other", (m.get(METHOD[g[6]] || g[6] || "Other") || 0) + g[5])); return [...m.entries()].sort((a, b) => b[1] - a[1]); }, [ok]);
  const [feed, setFeed] = useState(15);

  const copy = async (t: string) => { try { await navigator.clipboard.writeText(t); } catch { /* ignore */ } };
  const csv = (name: string, head: string[], rows: (string | number)[][]) => {
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([[head, ...rows].map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv" }));
    a.download = name; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <div className="cd">
      <div className="toolbar">
        <div>
          <h1 className="section-h" style={{ margin: 0 }}>{c.name}</h1>
          <div className="meta">{siteUrl.replace(/^https?:\/\//, "")}/{c.slug} · <span className={`pill ${c.status === "live" ? "ok" : c.status === "draft" ? "wait" : "off"}`}>{c.status}</span> · updated {stamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
        </div>
        <div className="acts">
          <label className="chk" style={{ fontSize: 13 }}><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Auto-refresh every minute</label>
          <button type="button" className="btn ghost sm" onClick={() => { router.refresh(); setStamp(new Date()); }}>Refresh</button>
          <Link className="btn ghost sm" href={`/admin/campaigns/${c.id}`}>Edit campaign</Link>
          {c.status !== "draft" && <Link className="btn ghost sm" href={`/${c.slug}`}>View page</Link>}
        </div>
      </div>

      <div className="cd-hero">
        <div>
          <div className="cd-big num">{fmt(total)}</div>
          <div className="meta num">{c.goal ? `${pct(total / c.goal)} of ${fmt(c.goal)} goal` : "raised"}{c.match > 1 ? ` · includes ${fmt(matched)} match` : ""}</div>
          <div className="track" style={{ marginTop: 10 }}><div className="fill" style={{ width: c.goal ? `${Math.min(100, (total / c.goal) * 100)}%` : "0%" }} /></div>
          {c.goal ? <div className="meta num" style={{ marginTop: 6 }}>{total >= c.goal ? "Goal reached!" : `${fmt(c.goal - total)} to go`}{c.matchCap && c.match > 1 ? ` · match: ${fmt(matched)} of ${fmt(c.matchCap)} used (${fmt(Math.max(0, c.matchCap - matched))} left)` : ""}</div> : null}
        </div>
        <div className="kpis num cd-kpis">
          <K l="From donors" v={fmt(raised)} s={`${num(ok.length)} gifts · avg ${fmt(ok.length ? raised / ok.length : 0)}`} />
          <K l="Donors" v={num(peopleNow.length)} s={`${num(newDonors)} new · ${num(returning.length)} returning`} />
          <K l="Last 24 hours" v={fmt(last24.reduce((s, g) => s + g[5], 0))} s={`${num(last24.length)} gifts`} />
          {prev && <K l={`vs. ${prev.name}`} v={prevAtSameDay ? (raised >= prevAtSameDay ? "▲ " : "▼ ") + pct(Math.abs(raised / prevAtSameDay - 1)) : "—"} s={`same point last time: ${fmt(prevAtSameDay)}`} tone={prevAtSameDay ? (raised >= prevAtSameDay ? "up" : "down") : undefined} />}
          {prev && <K l="Donors back from last time" v={pct(prevDonors.length ? returning.length / prevDonors.length : 0)} s={`${num(returning.length)} of ${num(prevDonors.length)} · ${num(lapsed.length)} still to reach`} />}
          <K l="Ambassadors" v={num(ambassadors.filter((a) => a.status === "live").length)} s={`${num(ambRows.filter((r) => r.raised > 0).length)} have raised · ${num(ambassadors.filter((a) => a.status === "pending").length)} waiting approval`} />
        </div>
      </div>

      <DonationAnalytics gifts={ok} ambassadorsCount={ambassadors.filter((a) => a.status === "live").length} teamsCount={teams.length} />

      <div className="an-grid" style={{ marginTop: 16 }}>
        <section className="panel">
          <h2>Pace{prev ? ` vs. ${prev.name}` : ""}</h2>
          <p>Money from donors by day since the first gift{prev ? "; the gray line is last time" : ""}.</p>
          <Pace now={paceNow} prev={pacePrev} />
        </section>
        <section className="panel">
          <h2>When people give</h2>
          <p>Money by hour of day (New York time). Good for timing texts and pushes.</p>
          <Bars values={byHour} labels={byHour.map((_, h) => (h % 3 === 0 ? (h === 0 ? "12a" : h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`) : ""))} full={byHour.map((_, h) => `${h === 0 ? 12 : h > 12 ? h - 12 : h}${h < 12 ? "am" : "pm"}`)} />
        </section>
        <section className="panel">
          <h2>By day</h2>
          <Bars values={byDay.map((d) => d[1])} labels={byDay.map((d, i) => (i % Math.ceil(byDay.length / 8) === 0 ? d[0].slice(5) : ""))} full={byDay.map((d) => d[0])} />
        </section>
        <section className="panel">
          <h2>Payment methods</h2>
          <div className="an-bars">{byMethod.map(([m, v]) => (
            <div key={m} className="an-bar"><div className="an-bar-l">{m}</div><div className="an-bar-t"><div className="an-bar-f" style={{ width: pct(v / (raised || 1)), background: "var(--berry)" }} /></div><div className="an-bar-v num">{fmt(v)}</div></div>
          ))}</div>
        </section>
      </div>

      <h2 className="section-h" id="ambassadors">Ambassador command center</h2>
      <div className="toolbar">
        <div className="an-filters" style={{ margin: 0 }}>
          <input className="search" placeholder="Search ambassador or team" value={aQ} onChange={(e) => { setAQ(e.target.value); setAPage(0); }} />
          <select className="in" value={aFilter} onChange={(e) => { setAFilter(e.target.value); setAPage(0); }} aria-label="Show">
            <option value="all">All ambassadors</option><option value="zero">Haven&apos;t raised yet</option><option value="under">Under 50% of goal</option><option value="hit">Hit their goal</option><option value="quiet">No gift in 2+ days</option><option value="pending">Waiting approval</option>
          </select>
        </div>
        <button type="button" className="btn ghost sm" onClick={() => csv(`${c.slug}-ambassadors.csv`, ["Ambassador", "Team", "Status", "Phone", "Email", "Goal", "Raised", "% to goal", "Gap", "Donors", "Last gift", prev ? `Raised ${prev.name}` : "Before", "Past donors not back"], aList.map((r) => [r.a.name, r.team, r.a.status, r.a.phone, r.a.email, r.a.goal || "", Math.round(r.raised), r.toGoal == null ? "" : Math.round(r.toGoal * 100) + "%", r.gap ?? "", r.donors, r.last ? r.last.slice(0, 16).replace("T", " ") : "", r.before || "", r.lapsed.length]))}>Download CSV</button>
      </div>
      {!aList.length ? <div className="donors"><div className="empty">No ambassadors{ambassadors.length ? " match" : " yet. They sign up at " + siteUrl.replace(/^https?:\/\//, "") + "/ambassador"}.</div></div> : <>
        <div className="tw cd-sticky"><table>
          <thead><tr>{ath("name", "Ambassador", false)}{ath("team", "Team", false)}{ath("goal", "Goal")}{ath("raised", "Raised")}{ath("toGoal", "% to goal")}{ath("gap", "Gap")}{ath("donors", "Donors")}{ath("last", "Last gift")}{prev && ath("before", "Last time")}{prev && ath("change", "Change")}{prev && ath("lapsed", "Past donors not back")}<th>Actions</th></tr></thead>
          <tbody>{aList.slice(aPage * PAGE, aPage * PAGE + PAGE).map((r) => (
            <tr key={r.a.id}>
              <td><b>{r.a.name}</b>{r.a.status !== "live" && <> <span className={`pill ${r.a.status === "pending" ? "wait" : "off"}`}>{r.a.status}</span></>}</td>
              <td className="meta">{r.team || "—"}</td>
              <td className="r num">{r.a.goal ? fmt(r.a.goal) : "—"}</td>
              <td className="r num"><b>{fmt(r.raised)}</b></td>
              <td className="r num">{r.toGoal == null ? "—" : <><span className="an-share"><i style={{ width: pct(Math.min(1, r.toGoal)) }} /></span>{pct(r.toGoal)}</>}</td>
              <td className="r num">{r.gap == null ? "—" : r.gap ? fmt(r.gap) : "✓"}</td>
              <td className="r num">{num(r.donors)}</td>
              <td className="r meta">{r.last ? ago(r.last) : "—"}</td>
              {prev && <td className="r num">{r.before ? fmt(r.before) : "—"}</td>}
              {prev && <td className="r num">{r.before ? <span className={r.raised >= r.before ? "an-up" : "an-down"}>{r.raised >= r.before ? "▲" : "▼"} {pct(Math.abs(r.raised / r.before - 1))}</span> : "—"}</td>}
              {prev && <td className="r num">{r.lapsed.length || "—"}</td>}
              <td><span className="acts">
                {r.a.phone && r.lapsed.length > 0 && <a className="btn sm" href={`sms:${r.a.phone}?&body=${encodeURIComponent(listMsg(r))}`} title="Text them the list of their past donors who haven't given yet">Text list</a>}
                {r.a.phone && <a className="btn ghost sm" href={`sms:${r.a.phone}?&body=${encodeURIComponent(nudgeMsg(r))}`}>Nudge</a>}
                {r.lapsed.length > 0 && <button type="button" className="btn ghost sm" onClick={() => copy(listMsg(r))}>Copy list</button>}
                {r.a.status === "live" && <Link className="btn ghost sm" href={`/${c.slug}/${r.a.slug}`}>Page</Link>}
              </span></td>
            </tr>
          ))}</tbody>
        </table></div>
        <Pager page={aPage} total={aList.length} set={setAPage} />
      </>}

      {teamRows.length > 0 && <>
        <h2 className="section-h">Teams</h2>
        <div className="tw"><table>
          <thead><tr><th>Team</th><th className="r">Ambassadors</th><th className="r">Gifts</th><th className="r">Raised</th><th className="r">Goal</th><th className="r">% to goal</th></tr></thead>
          <tbody>{teamRows.map((r) => <tr key={r.t.id}><td><b>{r.t.name}</b></td><td className="r num">{r.members}</td><td className="r num">{num(r.gifts)}</td><td className="r num"><b>{fmt(r.raised)}</b></td><td className="r num">{r.t.goal ? fmt(r.t.goal) : "—"}</td><td className="r num">{r.t.goal ? pct(r.raised / r.t.goal) : "—"}</td></tr>)}</tbody>
        </table></div>
      </>}

      <div className="an-grid" style={{ marginTop: 24 }}>
        <section className="panel">
          <div className="toolbar" style={{ margin: 0 }}><h2>Latest gifts</h2><Link className="meta" href={`/admin/donations?c=${c.id}`}>All donations →</Link></div>
          {!ok.length ? <div className="empty">No gifts yet.</div> : <div className="cd-feed">
            {[...gifts].sort((a, b) => b[1].localeCompare(a[1])).slice(0, feed).map((g) => (
              <div key={g[0]} className="cd-item">
                <div><b>{g[2] || "Anonymous"}</b>{g[13] ? " (anon.)" : ""} <span className="meta">· {ago(g[1])}{g[8] ? ` · for ${g[8]}` : g[10] ? ` · ${g[10]}` : ""}{g[11] ? ` · ${g[11] === "monthly" ? "monthly" : g[11].split(":")[1] + " payments"}` : ""}</span>{g[14] && <div className="meta">“{g[14]}”</div>}</div>
                <div className="r num"><b>{fmt(g[5])}</b><div className="meta">{METHOD[g[6]] || g[6]}{g[12] !== "succeeded" ? ` · ${g[12]}` : ""}</div></div>
              </div>
            ))}
            {gifts.length > feed && <button type="button" className="btn ghost sm" onClick={() => setFeed((f) => f + 30)}>Show more</button>}
          </div>}
        </section>
        <section className="panel">
          <div className="toolbar" style={{ margin: 0 }}><h2>Win back: gave last time, not yet now</h2>{lapsed.length > 0 && <button type="button" className="btn ghost sm" onClick={() => csv(`${c.slug}-not-yet-given.csv`, ["Name", "Email", "Phone", `Gave ${prev?.name || "last time"}`, "Lifetime", "Ambassador"], lapsed.map((p) => [p.name, p.email, p.phone, p.byCamp.prev, p.lifetime, p.amb]))}>CSV</button>}</div>
          {!prev ? <div className="empty">No earlier {c.kind} campaign to compare with.</div> : !lapsed.length ? <div className="empty">Everyone from {prev.name} has given again. 🎉</div> : <>
            <p>{num(lapsed.length)} people gave {fmt(lapsed.reduce((s, p) => s + p.byCamp.prev, 0))} to {prev.name} and haven&apos;t given yet. <Link href="/admin/outreach">Text them from Outreach →</Link></p>
            <div className="tw"><table><thead><tr><th>Donor</th><th className="r">Last time</th><th>Phone</th><th>Through</th></tr></thead><tbody>
              {lapsed.slice(0, 12).map((p) => <tr key={p.key}><td>{p.name}</td><td className="r num">{fmt(p.byCamp.prev)}</td><td className="num">{p.phone ? <a href={`sms:${p.phone}`}>{p.phone}</a> : "—"}</td><td className="meta">{p.amb || "—"}</td></tr>)}
            </tbody></table></div>
          </>}
        </section>
        <section className="panel">
          <div className="toolbar" style={{ margin: 0 }}><h2>Started but didn&apos;t finish</h2>{abandoned.length > 0 && <button type="button" className="btn ghost sm" onClick={() => csv(`${c.slug}-abandoned.csv`, ["Started", "Name", "Email", "Phone", "Amount", "Ambassador"], abandoned.map((s) => [s.ts.slice(0, 16).replace("T", " "), s.name, s.email, s.phone, s.amount, ambassadors.find((a) => a.id === s.ambassadorId)?.name || ""]))}>CSV</button>}</div>
          {!abandoned.length ? <div className="empty">Nobody has dropped off at checkout.</div> : <>
            <p>{num(abandoned.length)} people opened checkout for {fmt(abandoned.reduce((s, x) => s + x.amount, 0))} and didn&apos;t complete it. A quick personal text usually brings them back.</p>
            <div className="tw"><table><thead><tr><th>When</th><th>Name</th><th className="r">Amount</th><th>Contact</th></tr></thead><tbody>
              {abandoned.slice(0, 15).map((s, i) => <tr key={i}><td className="meta">{ago(s.ts)}</td><td>{s.name}</td><td className="r num">{fmt(s.amount)}</td><td>{s.phone ? <a href={`sms:${s.phone}?&body=${encodeURIComponent(`Hi ${firstOf(s.name)}, thank you for starting a gift to ${c.name}! If anything got stuck, here's the link: ${siteUrl}/${c.slug}`)}`}>Text</a> : <a href={`mailto:${s.email}`}>{s.email}</a>}</td></tr>)}
            </tbody></table></div>
          </>}
        </section>
        <section className="panel">
          <h2>Monthly and installment plans</h2>
          {!plans.length ? <div className="empty">No recurring or installment gifts yet.</div> : (
            <div className="tw"><table><thead><tr><th>Donor</th><th>Plan</th><th className="r">Amount</th><th className="r">Payments</th><th>Last</th><th>Status</th></tr></thead><tbody>
              {plans.slice(0, 20).map((p, i) => <tr key={i}><td>{p.name}</td><td className="meta">{p.label}</td><td className="r num">{fmt(p.amount)}</td><td className="r num">{p.payments}</td><td className="meta">{ago(p.last)}</td><td><span className={`pill ${p.state === "Active" || p.state === "Pledged" ? "ok" : p.state === "Due" ? "wait" : "off"}`}>{p.state}</span></td></tr>)}
            </tbody></table></div>
          )}
        </section>
      </div>
    </div>
  );
}

function K({ l, v, s, tone }: { l: string; v: string; s: string; tone?: "up" | "down" }) {
  return <div className="kpi"><span>{l}</span><b className={tone ? (tone === "up" ? "an-up" : "an-down") : ""}>{v}</b><small>{s}</small></div>;
}

function Pager({ page, total, set }: { page: number; total: number; set: (n: number) => void }) {
  const pages = Math.ceil(total / PAGE);
  if (pages <= 1) return null;
  return (
    <div className="cd-pager">
      <button type="button" className="btn ghost sm" disabled={!page} onClick={() => set(page - 1)}>← Prev</button>
      <span className="meta num">{page * PAGE + 1}–{Math.min(total, page * PAGE + PAGE)} of {num(total)}</span>
      <button type="button" className="btn ghost sm" disabled={page >= pages - 1} onClick={() => set(page + 1)}>Next →</button>
    </div>
  );
}

function Bars({ values, labels, full }: { values: number[]; labels: string[]; full: string[] }) {
  const [h, setH] = useState(-1);
  const max = Math.max(1, ...values);
  if (!values.some((v) => v > 0)) return <div className="empty">No gifts yet.</div>;
  return (
    <div className="cd-bars" style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }} onMouseLeave={() => setH(-1)}>
      {values.map((v, i) => (
        <div key={i} className="cd-col" onMouseEnter={() => setH(i)} tabIndex={0} onFocus={() => setH(i)} aria-label={`${full[i]}: ${fmt(v)}`}>
          <div className="cd-colbar" style={{ height: `${(v / max) * 100}%`, opacity: h === -1 || h === i ? 1 : 0.45 }} />
          <div className="cd-collab">{labels[i]}</div>
          {h === i && <div className="an-tip num" style={{ left: "50%", transform: "translateX(-50%)", top: -34 }}><b>{full[i]}</b> · {fmt(v)}</div>}
        </div>
      ))}
    </div>
  );
}

function Pace({ now, prev }: { now: number[]; prev: number[] }) {
  const [hx, setHx] = useState<number | null>(null);
  if (!now.length && !prev.length) return <div className="empty">No gifts yet.</div>;
  const W = 600, H = 220, L = 50, R = 24, T = 10, B = 26;
  const maxX = Math.max(1, Math.min(120, Math.max(now.length, prev.length) - 1));
  const maxY = Math.max(1, ...now.slice(0, maxX + 1), ...prev.slice(0, maxX + 1));
  const x = (d: number) => L + (d / maxX) * (W - L - R);
  const y = (v: number) => T + (1 - v / maxY) * (H - T - B);
  const line = (a: number[]) => a.slice(0, maxX + 1).map((v, d) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const at = (a: number[], d: number) => (a.length ? a[Math.min(d, a.length - 1)] : 0);
  return (
    <div className="an-pace">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Cumulative money by day, this campaign vs last"
        onMouseMove={(e) => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); setHx(Math.max(0, Math.min(maxX, Math.round(((((e.clientX - r.left) / r.width) * W - L) / (W - L - R)) * maxX)))); }}
        onMouseLeave={() => setHx(null)}>
        {[0, 0.5, 1].map((f) => <g key={f}><line x1={L} x2={W - R} y1={y(f * maxY)} y2={y(f * maxY)} className="an-grid-l" /><text x={L - 6} y={y(f * maxY) + 4} textAnchor="end" className="an-ax">{short(f * maxY)}</text></g>)}
        {[0, Math.round(maxX / 2), maxX].map((t) => <text key={t} x={x(t)} y={H - 6} textAnchor="middle" className="an-ax">day {t}</text>)}
        {prev.length > 0 && <polyline fill="none" stroke="var(--muted)" strokeWidth={2} strokeDasharray="5 4" points={line(prev)} />}
        {now.length > 0 && <polyline fill="none" stroke="var(--berry)" strokeWidth={2.5} strokeLinejoin="round" points={line(now)} />}
        {hx != null && <line x1={x(hx)} x2={x(hx)} y1={T} y2={H - B} className="an-cross" />}
      </svg>
      {hx != null && <div className="an-tip an-tip-pace num"><b>Day {hx}</b><div><span className="an-dot" style={{ background: "var(--berry)" }} />This campaign: {hx < now.length ? fmt(at(now, hx)) : "—"}</div>{prev.length > 0 && <div><span className="an-dot" style={{ background: "var(--muted)" }} />Last time: {fmt(at(prev, hx))}</div>}</div>}
      <div className="an-legend"><span><span className="an-dot" style={{ background: "var(--berry)" }} />This campaign</span>{prev.length > 0 && <span><span className="an-dot" style={{ background: "var(--muted)" }} />Last time</span>}</div>
    </div>
  );
}

const OFFLINE = new Set(["check", "cash", "zelle", "wire", "other"]);
const TIERS: [string, number, number][] = [["$1–35", 0, 36], ["$36–99", 36, 100], ["$100–179", 100, 180], ["$180–359", 180, 360], ["$360–999", 360, 1000], ["$1k–4,999", 1000, 5000], ["$5k+", 5000, Infinity]];
function DonationAnalytics({ gifts, ambassadorsCount, teamsCount }: { gifts: DGift[]; ambassadorsCount: number; teamsCount: number }) {
  const [page, setPage] = useState<"main" | "amb">("main");
  const sum = (a: DGift[]) => a.reduce((s, g) => s + g[5], 0);
  const single = gifts.filter((g) => !g[11]), monthly = gifts.filter((g) => g[11] === "monthly"), inst = gifts.filter((g) => g[11].startsWith("installments"));
  const offline = gifts.filter((g) => OFFLINE.has(g[6])), online = gifts.filter((g) => !OFFLINE.has(g[6]));
  const main = gifts.filter((g) => !g[7] && !g[9]), viaAmb = gifts.filter((g) => g[7] || g[9]);
  const pick = page === "main" ? main : viaAmb;
  const amts = pick.map((g) => g[5]);
  const tiers = TIERS.map(([l, lo, hi]) => ({ l, n: gifts.filter((g) => g[5] >= lo && g[5] < hi).length }));
  const maxT = Math.max(1, ...tiers.map((t) => t.n));
  const card = (title: string, cls: string, a: DGift[]) => (
    <div className={`cd-type ${cls}`}><h3>{title}</h3><div className="num"><b>{fmt(sum(a))}</b><small>Amount</small></div><div className="num"><b>{num(a.length)}</b><small>Count</small></div><div className="num"><b>{fmt(a.length ? sum(a) / a.length : 0)}</b><small>Average</small></div></div>
  );
  return (
    <>
      <h2 className="section-h">Donation analytics</h2>
      <div className="cd-types">
        {card("Single donations", "t1", single)}
        {card("Recurring donations", "t2", monthly)}
        {card("Installment donations", "t3", inst)}
      </div>
      <div className="an-grid" style={{ marginTop: 16 }}>
        <section className="panel">
          <h2>Online vs. offline</h2>
          <div className="cd-split num">
            <div><span className="meta">Online</span><b>{fmt(sum(online))}</b><small>{num(online.length)} gifts</small></div>
            <div><span className="meta">Offline</span><b>{fmt(sum(offline))}</b><small>{num(offline.length)} checks, cash, etc.</small></div>
          </div>
          <div className="cd-stack" aria-hidden="true"><i style={{ width: pct(sum(online) / (sum(gifts) || 1)) }} /></div>
          <div className="cd-counts num"><span><b>{num(gifts.length)}</b> donations</span><span><b>{num(ambassadorsCount)}</b> ambassadors</span><span><b>{num(teamsCount)}</b> teams</span></div>
        </section>
        <section className="panel">
          <div className="toolbar" style={{ margin: 0 }}><h2>Donation information</h2>
            <select className="in" value={page} onChange={(e) => setPage(e.target.value as "main" | "amb")} style={{ padding: "6px 10px" }} aria-label="Page"><option value="main">Main page</option><option value="amb">Ambassador &amp; team pages</option></select>
          </div>
          <div className="cd-info num">
            <div><b>{fmt(sum(pick))}</b><small>Amount raised</small></div><div><b>{num(pick.length)}</b><small>Donations</small></div>
            <div><b>{fmt(amts.length ? Math.min(...amts) : 0)}</b><small>Lowest</small></div><div><b>{fmt(amts.length ? sum(pick) / amts.length : 0)}</b><small>Average</small></div><div><b>{fmt(amts.length ? Math.max(...amts) : 0)}</b><small>Highest</small></div>
          </div>
        </section>
        <section className="panel" style={{ gridColumn: "1 / -1" }}>
          <h2>Donation distribution</h2><p>Number of donations per gift size.</p>
          <div className="an-hist" style={{ gridTemplateColumns: `repeat(${tiers.length}, 1fr)` }}>
            {tiers.map((t) => <div key={t.l} className="an-hcol" title={`${t.l}: ${t.n} donations`}><div className="an-hval num">{num(t.n)}</div><div className="an-hbar" style={{ height: `${(t.n / maxT) * 100}%` }} /><div className="an-hlab">{t.l}</div></div>)}
          </div>
        </section>
      </div>
    </>
  );
}
