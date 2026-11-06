"use client";
import { useMemo, useState, useTransition } from "react";
import { buildPeople, firstOf, normName, type G, type Person } from "@/lib/people";
import { fmtPhone, money } from "@/lib/format";
import { markTexted, setDoNotText } from "@/app/admin/actions";

type Camp = { id: string; name: string; slug: string; kind: string; year: number | null; status: string };
type Props = {
  campaigns: Camp[];
  gifts: G[];
  ambassadors: { campaign_id: string; name: string; phone: string; status: string }[];
  texted: [string, string, string][];
  doNotText: string[];
  templates: { donor: string; ambassador: string };
  siteUrl: string;
};
const KIND: Record<string, string> = { hike: "Hike", volleyball: "Volleyball Tournament" };
const sms = (phone: string, body: string) => `sms:${phone}?&body=${encodeURIComponent(body)}`;
const PER = 100;

export default function Outreach({ campaigns, gifts, ambassadors, texted, doNotText, templates, siteUrl }: Props) {
  const people = useMemo(() => buildPeople(gifts), [gifts]);
  const byId = useMemo(() => new Map(campaigns.map((c) => [c.id, c])), [campaigns]);
  const [target, setTarget] = useState(() => (campaigns.find((c) => c.status === "live") || campaigns.find((c) => c.status === "draft") || campaigns[campaigns.length - 1])?.id || "");
  const [base, setBase] = useState("type");
  const [tab, setTab] = useState<"donors" | "amb">("donors");
  const [view, setView] = useState<"notyet" | "texted" | "gave" | "all">("notyet");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("prior");
  const [phoneOnly, setPhoneOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [tx, setTx] = useState(() => { const m = new Map<string, string>(); texted.forEach(([c, k, d]) => m.set(c + "|" + k, d)); return m; });
  const [dnt, setDnt] = useState(() => new Set(doNotText));
  const [toast, setToast] = useState("");
  const [, start] = useTransition();
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const tc = byId.get(target);
  const sameKind = campaigns.filter((c) => tc && c.kind === tc.kind);
  const baseIds = useMemo(() => {
    if (!tc) return [] as string[];
    const others = campaigns.filter((c) => c.id !== target);
    if (base === "type") return others.filter((c) => c.kind === tc.kind).map((c) => c.id);
    if (base === "all") return others.map((c) => c.id);
    if (base === "last") { const s = others.filter((c) => c.kind === tc.kind && (c.year || 0) < (tc.year || 9999)).sort((a, b) => (b.year || 0) - (a.year || 0)); return s[0] ? [s[0].id] : []; }
    return [base];
  }, [campaigns, target, base, tc]);

  const rows = useMemo(() => people.map((p) => {
    const prior = baseIds.reduce((s, id) => s + (p.byCamp[id] || 0), 0);
    let lastBase = "";
    for (const id of baseIds) if (p.byCamp[id] && (!lastBase || (byId.get(id)?.year || 0) >= (byId.get(lastBase)?.year || 0))) lastBase = id;
    return { p, prior, now: p.byCamp[target] || 0, lastBase };
  }).filter((r) => r.prior > 0 || r.now > 0), [people, baseIds, target, byId]);

  const link = tc ? `${siteUrl}/${tc.slug}` : siteUrl;
  const fill = (tpl: string, p: Person, lastBase: string) => tpl
    .replace(/\{first\}/g, firstOf(p.name)).replace(/\{amount\}/g, money(lastBase ? p.byCamp[lastBase] : p.last?.amount))
    .replace(/\{kind\}/g, KIND[tc?.kind || ""] || "campaign").replace(/\{campaign\}/g, tc?.name || "").replace(/\{link\}/g, link);
  const isTexted = (k: string) => tx.get(target + "|" + k);

  const notYet = rows.filter((r) => r.prior > 0 && !r.now);
  const renewed = rows.filter((r) => r.prior > 0 && r.now);
  let list = view === "notyet" ? notYet : view === "texted" ? notYet.filter((r) => isTexted(r.p.key)) : view === "gave" ? rows.filter((r) => r.now) : rows;
  const ql = normName(q);
  if (ql) list = list.filter((r) => normName(`${r.p.name} ${r.p.email} ${r.p.phone} ${r.p.amb}`).includes(ql));
  if (phoneOnly) list = list.filter((r) => r.p.phone && !dnt.has(r.p.key));
  const sorters: Record<string, (a: typeof rows[0], b: typeof rows[0]) => number> = {
    prior: (a, b) => b.prior - a.prior, lifetime: (a, b) => b.p.lifetime - a.p.lifetime, name: (a, b) => a.p.name.localeCompare(b.p.name),
    recent: (a, b) => (b.p.last?.date || "").localeCompare(a.p.last?.date || ""), now: (a, b) => b.now - a.now,
  };
  list = [...list].sort(sorters[sort]);
  const pages = Math.max(1, Math.ceil(list.length / PER));
  const pageRows = list.slice(page * PER, page * PER + PER);
  const bulk = (sel.size ? list.filter((r) => sel.has(r.p.key)) : list).filter((r) => !r.now && !dnt.has(r.p.key));

  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); flash("Copied"); } catch { flash("Couldn't copy here"); } };
  const mark = (keys: string[], undo = false) => {
    const m = new Map(tx);
    const d = new Date().toISOString().slice(0, 10);
    keys.forEach((k) => (undo ? m.delete(target + "|" + k) : m.set(target + "|" + k, d)));
    setTx(m);
    start(async () => { await markTexted(target, keys, undo); });
  };
  const download = (name: string, csv: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const qv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

  // ---- ambassadors: everyone who raised money in same-kind campaigns
  const ambRows = useMemo(() => {
    if (!tc) return [];
    const m = new Map<string, { name: string; by: Record<string, number>; donors: Record<string, number> }>();
    for (const g of gifts) {
      if (!g[6] || !sameKind.some((c) => c.id === g[0])) continue;
      const k = normName(g[6]);
      const e = m.get(k) || { name: g[6], by: {}, donors: {} };
      e.by[g[0]] = (e.by[g[0]] || 0) + g[4];
      e.donors[g[0]] = (e.donors[g[0]] || 0) + 1;
      m.set(k, e);
    }
    const phoneByName = new Map<string, string>();
    ambassadors.forEach((a) => a.phone && phoneByName.set(normName(a.name), a.phone));
    people.forEach((p) => p.phone && !phoneByName.has(normName(p.name)) && phoneByName.set(normName(p.name), p.phone));
    const signedUp = new Set(ambassadors.filter((a) => a.campaign_id === target).map((a) => normName(a.name)));
    return [...m.entries()].map(([k, e]) => {
      const prev = sameKind.filter((c) => c.id !== target && e.by[c.id]).sort((a, b) => (b.year || 0) - (a.year || 0))[0];
      return { key: "a:" + k, name: e.name.replace(/\b[a-z]/g, (c) => c.toUpperCase()), by: e.by, donors: e.donors, phone: phoneByName.get(k) || "", joined: signedUp.has(k) || !!e.by[target], last: prev ? { name: prev.name, amt: e.by[prev.id] } : null };
    }).filter((a) => a.last || a.joined).sort((a, b) => (b.last?.amt || 0) - (a.last?.amt || 0));
  }, [gifts, ambassadors, people, sameKind, target, tc]);
  const ambMsg = (a: (typeof ambRows)[0]) => templates.ambassador
    .replace(/\{first\}/g, firstOf(a.name)).replace(/\{raised\}/g, money(a.last?.amt)).replace(/\{campaign\}/g, tc?.name || "")
    .replace(/\{kind\}/g, KIND[tc?.kind || ""] || "campaign").replace(/\{link\}/g, `${siteUrl}/ambassador?join=${tc?.slug || ""}`);

  if (!tc) return <div className="donors"><div className="empty">Create a campaign and import past campaigns to use Outreach.</div></div>;
  const opts: [string, string][] = [["type", `All past ${KIND[tc.kind]?.toLowerCase() || "campaign"}s`], ["last", "Last year's only"], ["all", "Any campaign"], ...campaigns.filter((c) => c.id !== target).map((c) => [c.id, c.name] as [string, string])];

  return (
    <>
      <div className="toolbar"><h1 className="section-h" style={{ margin: 0 }}>Outreach</h1>
        <div className="tabs" style={{ border: 0, margin: 0 }}>
          <button className="tab" aria-selected={tab === "donors"} onClick={() => setTab("donors")}>Donors</button>
          <button className="tab" aria-selected={tab === "amb"} onClick={() => setTab("amb")}>Past ambassadors</button>
        </div>
      </div>
      <div className="panel" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "end", marginBottom: 14 }}>
        <label className="f" style={{ minWidth: 220 }}>Gave to<select className="in" value={base} onChange={(e) => { setBase(e.target.value); setPage(0); }}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        <span className="meta" style={{ paddingBottom: 10 }}>but not yet to</span>
        <label className="f" style={{ minWidth: 220 }}>This campaign<select className="in" value={target} onChange={(e) => { setTarget(e.target.value); setPage(0); setSel(new Set()); }}>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}{c.status === "live" ? " (live)" : ""}</option>)}</select></label>
      </div>

      {tab === "donors" && (
        <>
          <div className="kpis num">
            <div className="kpi"><span>Gave before</span><b>{(notYet.length + renewed.length).toLocaleString()}</b><small>{baseIds.length} campaigns compared</small></div>
            <div className="kpi"><span>Haven&apos;t given yet</span><b>{notYet.length.toLocaleString()}</b><small>{money(notYet.reduce((s, r) => s + r.prior, 0))} given before</small></div>
            <div className="kpi"><span>Already gave</span><b>{renewed.length.toLocaleString()}</b><small>{rows.filter((r) => r.now && !r.prior).length} new donors</small></div>
            <div className="kpi"><span>Texted</span><b>{notYet.filter((r) => isTexted(r.p.key)).length.toLocaleString()}</b><small>still waiting</small></div>
          </div>
          <div className="toolbar">
            <div className="tabs" style={{ margin: 0, border: 0 }}>
              {([["notyet", `Not yet (${notYet.length})`], ["texted", "Texted, waiting"], ["gave", "Gave"], ["all", `Everyone (${rows.length})`]] as const).map(([k, l]) => <button key={k} className="tab" aria-selected={view === k} onClick={() => { setView(k); setPage(0); setSel(new Set()); }}>{l}</button>)}
            </div>
            <input className="search" placeholder="Search name, email, phone, ambassador" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
            <select className="in" style={{ maxWidth: 200 }} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
              <option value="prior">Most given before</option><option value="lifetime">Lifetime giving</option><option value="recent">Most recent gift</option><option value="name">Name A–Z</option><option value="now">Given this campaign</option>
            </select>
            <label className="chk"><input type="checkbox" checked={phoneOnly} onChange={(e) => setPhoneOnly(e.target.checked)} /> Has a phone</label>
          </div>
          <div className="tw"><table><thead><tr>
            <th><input type="checkbox" aria-label="Select page" checked={pageRows.length > 0 && pageRows.every((r) => sel.has(r.p.key))} onChange={(e) => { const s = new Set(sel); pageRows.forEach((r) => (e.target.checked ? s.add(r.p.key) : s.delete(r.p.key))); setSel(s); }} /></th>
            <th>Donor</th><th>Phone</th>{sameKind.map((c) => <th key={c.id} className="r">{c.year}{c.id === target ? " ●" : ""}</th>)}<th className="r">Lifetime</th><th>Ambassador</th><th>Status</th><th>Reach out</th>
          </tr></thead><tbody>
            {pageRows.map((r) => {
              const p = r.p, stop = dnt.has(p.key), t = isTexted(p.key), msg = fill(templates.donor, p, r.lastBase);
              return (
                <tr key={p.key} style={r.now ? { color: "var(--muted)" } : undefined}>
                  <td><input type="checkbox" aria-label={`Select ${p.name}`} checked={sel.has(p.key)} onChange={(e) => { const s = new Set(sel); if (e.target.checked) s.add(p.key); else s.delete(p.key); setSel(s); }} /></td>
                  <td><b>{p.name}</b><div className="meta">{p.email || "no email"}</div></td>
                  <td className="num">{p.phone ? fmtPhone(p.phone) : "—"}</td>
                  {sameKind.map((c) => <td key={c.id} className="r num" style={{ color: p.byCamp[c.id] ? (c.id === target ? "var(--ok)" : "var(--ink)") : "var(--muted)", fontWeight: p.byCamp[c.id] ? 600 : 400 }}>{p.byCamp[c.id] ? money(p.byCamp[c.id]) : "·"}</td>)}
                  <td className="r num">{money(p.lifetime)}</td>
                  <td>{p.amb || "—"}</td>
                  <td>{r.now ? <span className="pill ok">Gave {money(r.now)}</span> : stop ? <span className="pill off">Don&apos;t text</span> : t ? <span className="pill wait">Texted {t.slice(5)}</span> : <span className="pill wait" style={{ background: "var(--berry-soft)", color: "var(--berry)" }}>Not yet</span>}</td>
                  <td><div className="acts">
                    {!r.now && p.phone && !stop && <a className="btn sm" href={sms(p.phone, msg)} onClick={() => mark([p.key])}>Text</a>}
                    {!r.now && <button className="btn ghost sm" onClick={() => copy(msg)}>Copy message</button>}
                    {!r.now && t && <button className="btn ghost sm" onClick={() => mark([p.key], true)}>Unmark</button>}
                    {!r.now && <button className="btn ghost sm" title={stop ? "Allow texts again" : "Never text this person"} onClick={() => { const s = new Set(dnt); if (stop) s.delete(p.key); else s.add(p.key); setDnt(s); start(async () => { await setDoNotText(p.key, !stop); }); }}>{stop ? "Allow" : "Stop"}</button>}
                  </div></td>
                </tr>
              );
            })}
          </tbody></table></div>
          {!list.length && <div className="donors" style={{ marginTop: 10 }}><div className="empty">{q ? "Nobody matches that search." : view === "notyet" ? "Everyone who gave before has given to this campaign." : "Nobody here yet."}</div></div>}
          <div className="toolbar" style={{ marginTop: 10 }}>
            <span className="meta num">{list.length ? `${(page * PER + 1).toLocaleString()}–${Math.min(list.length, (page + 1) * PER).toLocaleString()} of ${list.length.toLocaleString()}` : ""}</span>
            <span style={{ display: "flex", gap: 6 }}><button className="btn ghost sm" disabled={!page} onClick={() => setPage(page - 1)}>Previous</button><button className="btn ghost sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</button></span>
          </div>
          <div className="panel" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", position: "sticky", bottom: 10, background: "var(--navy)", color: "var(--band)" }}>
            <b className="num">{sel.size ? `${sel.size.toLocaleString()} selected` : `All ${list.length.toLocaleString()} shown`}</b>
            {sel.size ? <button className="btn ghost sm" onClick={() => setSel(new Set())}>Clear</button> : <button className="btn ghost sm" onClick={() => setSel(new Set(list.map((r) => r.p.key)))}>Select all</button>}
            <span style={{ flex: 1 }} />
            <button className="btn ghost sm" onClick={() => { const ph = bulk.filter((r) => r.p.phone).map((r) => r.p.phone); ph.length ? copy(ph.join(", ")) : flash("No phone numbers in this list"); }}>Copy phone numbers</button>
            <button className="btn ghost sm" onClick={() => { const b = bulk.filter((r) => r.p.phone); if (!b.length) return flash("No phone numbers in this list"); download(`${tc.slug}-not-yet-given.csv`, ["Phone,First name,Full name,Email,Given before,Last ambassador,Message", ...b.map((r) => [r.p.phone, firstOf(r.p.name), r.p.name, r.p.email, Math.round(r.prior), r.p.amb, fill(templates.donor, r.p, r.lastBase)].map(qv).join(","))].join("\n")); }}>Download list for bulk texting</button>
            <button className="btn sm" onClick={() => { if (!bulk.length) return flash("Nobody to mark"); mark(bulk.map((r) => r.p.key)); flash(`Marked ${bulk.length.toLocaleString()} as texted`); setSel(new Set()); }}>Mark as texted</button>
          </div>
        </>
      )}

      {tab === "amb" && (
        <>
          <p className="meta" style={{ marginBottom: 10 }}>Everyone who raised money for a past {KIND[tc.kind]?.toLowerCase() || "campaign"}, and whether they&apos;ve signed up for {tc.name}. Phones come from ambassador sign-ups or matching donor records.</p>
          <div className="tw"><table><thead><tr><th>Ambassador</th><th>Phone</th>{sameKind.map((c) => <th key={c.id} className="r">{c.year}{c.id === target ? " ●" : ""}</th>)}<th>This campaign</th><th>Invite</th></tr></thead><tbody>
            {ambRows.map((a) => (
              <tr key={a.key}>
                <td><b>{a.name}</b><div className="meta">{a.last ? `${money(a.last.amt)} last time` : "new"}</div></td>
                <td className="num">{a.phone ? fmtPhone(a.phone) : "—"}</td>
                {sameKind.map((c) => <td key={c.id} className="r num">{a.by[c.id] ? <>{money(a.by[c.id])}<div className="meta">{a.donors[c.id]} donors</div></> : <span className="meta">·</span>}</td>)}
                <td>{a.joined ? <span className="pill ok">Signed up</span> : isTexted(a.key) ? <span className="pill wait">Invited {isTexted(a.key)!.slice(5)}</span> : <span className="pill off">Not yet</span>}</td>
                <td><div className="acts">
                  {!a.joined && a.phone && <a className="btn sm" href={sms(a.phone, ambMsg(a))} onClick={() => mark([a.key])}>Text invite</a>}
                  {!a.joined && <button className="btn ghost sm" onClick={() => copy(ambMsg(a))}>Copy message</button>}
                </div></td>
              </tr>
            ))}
          </tbody></table></div>
          {!ambRows.length && <div className="donors" style={{ marginTop: 10 }}><div className="empty">No past ambassadors found for this kind of campaign. Import past campaigns first.</div></div>}
        </>
      )}
      {toast && <div role="status" style={{ position: "fixed", left: "50%", bottom: 20, transform: "translateX(-50%)", background: "var(--ink)", color: "var(--bg)", padding: "10px 16px", borderRadius: 9, zIndex: 30 }}>{toast}</div>}
    </>
  );
}
