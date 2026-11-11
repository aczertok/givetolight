"use client";
import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { comparePeople, type CG, type CPerson } from "@/lib/compare";
import { normName } from "@/lib/people";
import type { CampaignLite } from "@/lib/loadGifts";
import Compose from "@/components/Compose";
import { Pager, PickPair, csvDownload, fmt, num, pct } from "@/components/ui";

export type CAmb = { side: "prev" | "next"; name: string; slug: string; goal: number | null; phone: string; email: string; status: string; team: string };
type Row = { key: string; name: string; team: string; email: string; phone: string; slug: string; prev: number; next: number; prevD: number; nextD: number; prevN: number; nextN: number; prevGoal: number | null; nextGoal: number | null; last: string; missing: CPerson[] };
type Seg = "both" | "prev" | "next" | "all";

export default function AmbassadorCompare({ campaigns, prev, next, prevGifts, nextGifts, ambassadors, siteUrl }: {
  campaigns: CampaignLite[]; prev: CampaignLite | null; next: CampaignLite | null; prevGifts: CG[]; nextGifts: CG[]; ambassadors: CAmb[]; siteUrl: string;
}) {
  const router = useRouter();
  const people = useMemo(() => comparePeople(prevGifts, nextGifts), [prevGifts, nextGifts]);
  const rows = useMemo(() => {
    const m = new Map<string, Row>();
    const get = (name: string) => {
      const k = normName(name);
      let r = m.get(k);
      if (!r) { r = { key: k, name: name.trim(), team: "", email: "", phone: "", slug: "", prev: 0, next: 0, prevD: 0, nextD: 0, prevN: 0, nextN: 0, prevGoal: null, nextGoal: null, last: "", missing: [] }; m.set(k, r); }
      return r;
    };
    const donorsP = new Map<string, Set<string>>(), donorsN = new Map<string, Set<string>>();
    const add = (map: Map<string, Set<string>>, k: string, d: string) => (map.get(k) || map.set(k, new Set()).get(k)!).add(d);
    prevGifts.forEach((g) => { if (!g[5]) return; const r = get(g[5]); r.prev += g[3]; r.prevN++; add(donorsP, r.key, g[1] || g[2] || normName(g[0])); });
    nextGifts.forEach((g) => { if (!g[5]) return; const r = get(g[5]); r.next += g[3]; r.nextN++; if (g[4] > r.last) r.last = g[4]; add(donorsN, r.key, g[1] || g[2] || normName(g[0])); if (g[6] && !r.team) r.team = g[6]; });
    ambassadors.forEach((a) => {
      const r = get(a.name);
      if (a.side === "next") { r.nextGoal = a.goal; r.slug = a.slug; if (a.team) r.team = a.team; }
      else r.prevGoal = a.goal;
      if (a.email && (!r.email || a.side === "next")) r.email = a.email;
      if (a.phone && (!r.phone || a.side === "next")) r.phone = a.phone;
    });
    m.forEach((r) => { r.prevD = donorsP.get(r.key)?.size || 0; r.nextD = donorsN.get(r.key)?.size || 0; });
    people.forEach((p) => { if (p.prev > 0 && !p.next && p.prevAmb) { const r = m.get(normName(p.prevAmb)); if (r) r.missing.push(p); } });
    m.forEach((r) => r.missing.sort((a, b) => b.prev - a.prev));
    return [...m.values()];
  }, [prevGifts, nextGifts, ambassadors, people]);

  const inPrev = (r: Row) => r.prev > 0 || r.prevN > 0 || r.prevGoal != null;
  const inNext = (r: Row) => r.next > 0 || r.nextN > 0 || r.nextGoal != null || !!r.slug;
  const segs = { both: rows.filter((r) => inPrev(r) && inNext(r)), prev: rows.filter((r) => inPrev(r) && !inNext(r)), next: rows.filter((r) => !inPrev(r) && inNext(r)), all: rows };
  const totPrev = rows.reduce((s, r) => s + r.prev, 0), totNext = rows.reduce((s, r) => s + r.next, 0);
  const dPrev = rows.reduce((s, r) => s + r.prevD, 0), dNext = rows.reduce((s, r) => s + r.nextD, 0);

  const [seg, setSeg] = useState<Seg>("both");
  const [q, setQ] = useState("");
  const [team, setTeam] = useState("");
  const [minN, setMinN] = useState(""); const [maxN, setMaxN] = useState("");
  const [inactive, setInactive] = useState("");
  const [minP, setMinP] = useState(""); const [maxP, setMaxP] = useState("");
  const [sort, setSort] = useState<[string, number]>(["next", -1]);
  const [page, setPage] = useState(0); const [per, setPer] = useState(30);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState("");
  const [compose, setCompose] = useState<null | { list: Row[]; donorList: boolean }>(null);
  const teams = [...new Set(rows.map((r) => r.team).filter(Boolean))].sort();
  const prog = (r: Row) => (r.nextGoal ? r.next / r.nextGoal : null);
  const key: Record<string, (r: Row) => number | string> = {
    name: (r) => r.name, prev: (r) => r.prev, next: (r) => r.next, diff: (r) => (r.prev ? r.next / r.prev - 1 : r.next ? 99 : -1), prevD: (r) => r.prevD, nextD: (r) => r.nextD, dDiff: (r) => r.nextD - r.prevD,
    pg: (r) => (r.prevGoal ? r.prev / r.prevGoal : -1), ng: (r) => prog(r) ?? -1, missing: (r) => r.missing.length,
  };
  const filtered = useMemo(() => {
    const s = q.toLowerCase().trim(), lo = Number(minN) || 0, hi = maxN ? Number(maxN) : Infinity, pl = minP ? Number(minP) / 100 : -Infinity, ph = maxP ? Number(maxP) / 100 : Infinity;
    const days = Number(inactive) || 0, cutoff = days ? new Date(Date.now() - days * 864e5).toISOString().slice(0, 10) : "";
    return segs[seg].filter((r) => (!s || `${r.name} ${r.team}`.toLowerCase().includes(s)) && (!team || r.team === team) && r.nextN >= lo && r.nextN <= hi &&
      (!days || !r.last || r.last < cutoff) && ((pl === -Infinity && ph === Infinity) || (prog(r) != null && prog(r)! >= pl && prog(r)! <= ph)))
      .sort((a, b) => { const x = key[sort[0]](a), y = key[sort[0]](b); return (x > y ? 1 : x < y ? -1 : 0) * sort[1]; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, seg, q, team, minN, maxN, inactive, minP, maxP, sort]);
  const shown = filtered.slice(page * per, page * per + per);
  const allSel = filtered.length > 0 && filtered.every((r) => sel.has(r.key));
  const chosen = () => (sel.size ? filtered.filter((r) => sel.has(r.key)) : filtered);
  const th = (k: string, l: string) => <th className="r" aria-sort={sort[0] === k ? (sort[1] > 0 ? "ascending" : "descending") : "none"}><button type="button" className="an-sort" onClick={() => { setSort(([x, d]) => [k, x === k ? -d : -1]); setPage(0); }}>{l}{sort[0] === k ? (sort[1] > 0 ? " ↑" : " ↓") : ""}</button></th>;
  const chg = (a: number, b: number) => (!a ? (b ? <span className="an-up">new</span> : "—") : <span className={b >= a ? "an-up" : "an-down"}>{b >= a ? "+" : ""}{pct(b / a - 1)}</span>);
  const missingList = (r: Row) => r.missing.slice(0, 60).map((p) => `• ${p.name} (gave ${fmt(p.prev)}${p.phone ? ", " + p.phone : ""}${p.email ? ", " + p.email : ""})`).join("\n") + (r.missing.length > 60 ? `\n…and ${r.missing.length - 60} more` : "");
  const pageLink = (r: Row) => (next ? `${siteUrl}/${next.slug}${r.slug ? "/" + r.slug : ""}` : siteUrl);
  const reset = () => { setQ(""); setTeam(""); setMinN(""); setMaxN(""); setInactive(""); setMinP(""); setMaxP(""); setPage(0); };

  return (
    <div>
      <div className="toolbar"><h1 className="section-h" style={{ margin: 0 }}>Ambassador compare</h1></div>
      <PickPair campaigns={campaigns} prev={prev?.id || ""} next={next?.id || ""} onChange={(p, n) => router.push(`/admin/ambassador-compare?prev=${p}&next=${n}`)} />
      {!prev || !next ? <div className="donors"><div className="empty">Pick two campaigns.</div></div> : <>
        <div className="an-grid" style={{ marginBottom: 14 }}>
          <div className="panel ac-card"><span className="meta">Funds raised by ambassadors</span>
            <div className="ac-pair num"><div><b>{fmt(totPrev)}</b><small>{prev.name}</small></div><span>→</span><div><b>{fmt(totNext)}</b><small>{next.name}</small></div></div>
            <div className="ac-chg num">{chg(totPrev, totNext)} change</div></div>
          <div className="panel ac-card"><span className="meta">Donors through ambassadors</span>
            <div className="ac-pair num"><div><b>{num(dPrev)}</b><small>{prev.name}</small></div><span>→</span><div><b>{num(dNext)}</b><small>{next.name}</small></div></div>
            <div className="ac-chg num"><span className={dNext >= dPrev ? "an-up" : "an-down"}>{dNext >= dPrev ? "+" : ""}{num(dNext - dPrev)}</span> change</div></div>
        </div>

        <div className="cc-tabs" role="tablist">
          {([["both", "Ambassadors in both"], ["prev", "Only in previous"], ["next", "Only in new"], ["all", "All"]] as [Seg, string][]).map(([s, l]) => (
            <button key={s} type="button" role="tab" className="cc-tab" aria-selected={seg === s} onClick={() => { setSeg(s); setPage(0); setSel(new Set()); }}>{l}<span className="num">{num(segs[s].length)}</span></button>
          ))}
        </div>
        <div className="an-filters">
          <input className="search" placeholder="Search ambassador" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
          {teams.length > 0 && <select className="in" value={team} onChange={(e) => { setTeam(e.target.value); setPage(0); }} aria-label="Team"><option value="">All teams</option>{teams.map((t) => <option key={t}>{t}</option>)}</select>}
          <span className="meta">Donations</span><input className="in num an-amt" placeholder="min" value={minN} onChange={(e) => setMinN(e.target.value.replace(/\D/g, ""))} aria-label="Minimum donations" /><input className="in num an-amt" placeholder="max" value={maxN} onChange={(e) => setMaxN(e.target.value.replace(/\D/g, ""))} aria-label="Maximum donations" />
          <select className="in" value={inactive} onChange={(e) => setInactive(e.target.value)} aria-label="Inactive for"><option value="">Inactive for: any</option><option value="1">No gift in 1+ day</option><option value="2">2+ days</option><option value="3">3+ days</option><option value="7">7+ days</option></select>
          <span className="meta">Progress %</span><input className="in num an-amt" placeholder="min" value={minP} onChange={(e) => setMinP(e.target.value.replace(/\D/g, ""))} aria-label="Minimum progress" /><input className="in num an-amt" placeholder="max" value={maxP} onChange={(e) => setMaxP(e.target.value.replace(/\D/g, ""))} aria-label="Maximum progress" />
          <button type="button" className="btn ghost sm" onClick={reset}>Clear</button>
        </div>
        <div className="toolbar">
          <span className="meta">{num(filtered.length)} ambassadors{sel.size ? ` · ${sel.size} selected` : ""}</span>
          <div className="acts">
            <button type="button" className="btn sm" disabled={!filtered.length} onClick={() => setCompose({ list: chosen().filter((r) => r.missing.length), donorList: true })}>Send donor list</button>
            <button type="button" className="btn ghost sm" disabled={!filtered.length} onClick={() => setCompose({ list: chosen(), donorList: false })}>Compose message</button>
            <button type="button" className="btn ghost sm" onClick={() => csvDownload("ambassador-compare.csv", ["Ambassador", "Team", "Email", "Phone", "Raised (previous)", "Raised (new)", "Difference", "Donors (previous)", "Donors (new)", "Goal (previous)", "Goal (new)", "Progress (new)", "Past donors not back"],
              chosen().map((r) => [r.name, r.team, r.email, r.phone, r.prev, r.next, r.next - r.prev, r.prevD, r.nextD, r.prevGoal ?? "", r.nextGoal ?? "", prog(r) == null ? "" : Math.round(prog(r)! * 100) + "%", r.missing.length]))}>CSV</button>
          </div>
        </div>
        {!filtered.length ? <div className="donors"><div className="empty">No ambassadors match.</div></div> : <>
          <div className="tw cd-sticky"><table>
            <thead><tr>
              <th style={{ width: 34 }}><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(filtered.map((r) => r.key)))} aria-label="Select all" /></th>
              <th><button type="button" className="an-sort" onClick={() => setSort(([x, d]) => ["name", x === "name" ? -d : 1])}>Name</button></th>
              {th("prev", "Raised (prev)")}{th("next", "Raised (new)")}{th("diff", "Difference")}{th("prevD", "Donors (prev)")}{th("nextD", "Donors (new)")}{th("dDiff", "Difference")}{th("pg", "Goal (prev)")}{th("ng", "Goal (new)")}{th("missing", "Donors not back")}<th />
            </tr></thead>
            <tbody>{shown.map((r) => (
              <Fragment key={r.key}>
                <tr className={sel.has(r.key) ? "cc-sel" : ""}>
                  <td><input type="checkbox" checked={sel.has(r.key)} onChange={() => setSel((s) => { const n = new Set(s); if (n.has(r.key)) n.delete(r.key); else n.add(r.key); return n; })} aria-label={`Select ${r.name}`} /></td>
                  <td><b>{r.name}</b>{r.team && <div className="meta">{r.team}</div>}</td>
                  <td className="r num">{fmt(r.prev)}</td>
                  <td className="r num"><b>{fmt(r.next)}</b></td>
                  <td className="r num">{chg(r.prev, r.next)}</td>
                  <td className="r num">{num(r.prevD)}</td>
                  <td className="r num">{num(r.nextD)}</td>
                  <td className="r num"><span className={r.nextD >= r.prevD ? "an-up" : "an-down"}>{r.nextD - r.prevD > 0 ? "+" : ""}{num(r.nextD - r.prevD)}</span></td>
                  <td className="r num">{r.prevGoal ? `${pct(r.prev / r.prevGoal)} (${fmt(r.prevGoal)})` : "—"}</td>
                  <td className="r num">{r.nextGoal ? <><span className="an-share"><i style={{ width: pct(Math.min(1, r.next / r.nextGoal)) }} /></span>{pct(r.next / r.nextGoal)} ({fmt(r.nextGoal)})</> : "—"}</td>
                  <td className="r num">{r.missing.length ? <b>{r.missing.length}</b> : "—"}</td>
                  <td>{r.missing.length > 0 && <button type="button" className="btn ghost sm" aria-expanded={open === r.key} onClick={() => setOpen(open === r.key ? "" : r.key)}>{open === r.key ? "Hide" : "Donors"}</button>}</td>
                </tr>
                {open === r.key && (
                  <tr><td colSpan={12} style={{ background: "var(--sunk)" }}>
                    <div className="toolbar" style={{ margin: "4px 0 8px" }}><b>{r.name}&apos;s donors from {prev.name} who haven&apos;t given to {next.name}</b>
                      <button type="button" className="btn ghost sm" onClick={() => csvDownload(`${r.key.replace(/\s+/g, "-")}-missing.csv`, ["Name", "Email", "Phone", "Gave before"], r.missing.map((p) => [p.name, p.email, p.phone, p.prev]))}>CSV</button></div>
                    <div className="tw"><table><thead><tr><th>Donor</th><th>Email</th><th>Phone</th><th className="r">Gave before</th></tr></thead><tbody>
                      {r.missing.map((p) => <tr key={p.key}><td>{p.name}</td><td className="meta">{p.email || "—"}</td><td className="num">{p.phone ? <a href={`sms:${p.phone}`}>{p.phone}</a> : "—"}</td><td className="r num">{fmt(p.prev)}</td></tr>)}
                    </tbody></table></div>
                  </td></tr>
                )}
              </Fragment>
            ))}</tbody>
          </table></div>
          <Pager page={page} per={per} total={filtered.length} set={setPage} setPer={(n) => { setPer(n); setPage(0); }} />
        </>}
      </>}
      {compose && (
        <Compose
          recipients={compose.list.map((r) => ({ name: r.name, email: r.email, phone: r.phone, vars: { PREV_RAISED: fmt(r.prev), NEW_RAISED: fmt(r.next), GOAL: r.nextGoal ? fmt(r.nextGoal) : "", PROGRESS: prog(r) == null ? "" : pct(prog(r)!), MISSING_COUNT: String(r.missing.length), MISSING_LIST: missingList(r), LINK: pageLink(r), CAMPAIGN: next?.name || "" } }))}
          recipientType="ambassadors" campaignId={next?.id} kind={compose.donorList ? "donor_list" : "compose"}
          subject={compose.donorList ? "Here's who's missing" : `${next?.name || "Our campaign"}: how you're doing`}
          body={compose.donorList
            ? `Hi {{FIRST}},\n\nThank you for being an ambassador! These {{MISSING_COUNT}} people gave through you for ${prev?.name || "last year"} and haven't given to ${next?.name || "this year's campaign"} yet:\n\n{{MISSING_LIST}}\n\nA personal note or a quick call from you makes all the difference. Your page: {{LINK}}\n\nThank you!\nThe Lighthouse Project`
            : `Hi {{FIRST}},\n\nYou've raised {{NEW_RAISED}} so far for ${next?.name || "the campaign"} (last time: {{PREV_RAISED}}). Keep going!\n\nYour page: {{LINK}}\n\nThank you!\nThe Lighthouse Project`}
          tags={[["FIRST", "First name"], ["NEW_RAISED", "Raised this time"], ["PREV_RAISED", "Raised last time"], ["GOAL", "Their goal"], ["PROGRESS", "% of goal"], ["MISSING_COUNT", "How many past donors haven't given"], ["MISSING_LIST", "The list of those donors"], ["LINK", "Their page"]]}
          onClose={() => setCompose(null)}
        />
      )}
    </div>
  );
}
