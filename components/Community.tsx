"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/Bits";
import { money, timeAgo } from "@/lib/format";
import type { CampaignPage } from "@/lib/data";

type Tab = "ambassadors" | "teams" | "donors";

/** One panel for everyone behind the campaign: ambassadors, teams and donors. */
export default function Supporters({ page, canJoin, donationFilters = false }: { page: CampaignPage; canJoin: boolean; donationFilters?: boolean }) {
  const { ambassadors, teams, donations, factor, campaign } = page;
  const tabs: [Tab, string, number][] = [];
  if (ambassadors.length) tabs.push(["ambassadors", "Ambassadors", ambassadors.length]);
  if (teams.length) tabs.push(["teams", "Teams", teams.length]);
  tabs.push(["donors", "Donors", donations.length]);
  const [tab, setTab] = useState<Tab>(tabs[0][0]);
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(12);
  const [minGift, setMinGift] = useState("all");
  const [sortGifts, setSortGifts] = useState<"recent" | "high" | "low">("recent");
  const names = useMemo(() => new Map(ambassadors.map((a) => [a.id, a.name])), [ambassadors]);
  const ql = q.trim().toLowerCase();
  const pick = (t: Tab) => { setTab(t); setQ(""); setLimit(12); };

  const people = tab === "teams" ? teams : ambassadors;
  const shownPeople = people.filter((x) => !ql || x.name.toLowerCase().includes(ql) || ("teamName" in x && x.teamName?.toLowerCase().includes(ql)));
  const shownGifts = donations.filter(d => {
    const amount = Number(d.amount);
    const inRange = !donationFilters || minGift === "all" || minGift === "1000" && amount >= 1000 ||
      minGift === "500" && amount >= 500 && amount < 1000 ||
      minGift === "180" && amount >= 180 && amount < 500 ||
      minGift === "under" && amount < 180;
    return inRange && (!ql || d.display_name.toLowerCase().includes(ql) || (d.ambassador_id && names.get(d.ambassador_id)?.toLowerCase().includes(ql)));
  }).sort((a,b) => !donationFilters || sortGifts === "recent"
      ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      : sortGifts === "high" ? Number(b.amount) - Number(a.amount) : Number(a.amount) - Number(b.amount));
  const total = tab === "donors" ? shownGifts.length : shownPeople.length;

  return (
    <div className="ls">
      <div className="ls-bar">
        {tabs.length > 1 && <div className="lc-seg" role="tablist" aria-label="Supporters">
          {tabs.map(([k, l, n]) => (
            <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => pick(k)}>{l} <span className="num">{n}</span></button>
          ))}
        </div>}
        {(donations.length > 0 || people.length > 0) && (
          <input className="lc-search" type="search" placeholder="Search by name" aria-label="Search by name" value={q} onChange={(e) => { setQ(e.target.value); setLimit(12); }} />
        )}
      </div>

      {tab === "donors" && donationFilters && <div className="vl-donation-filters">
        <div className="vl-donation-bands" role="group" aria-label="Filter donations by amount">
          {([["all","All gifts"],["1000","$1,000+"],["500","$500–999"],["180","$180–499"],["under","Under $180"]] as const).map(([key,label]) => (
            <button type="button" key={key} aria-pressed={minGift === key} onClick={() => { setMinGift(key); setLimit(12); }}>{label}</button>
          ))}
        </div>
        <select aria-label="Sort donations" value={sortGifts} onChange={e => setSortGifts(e.target.value as "recent" | "high" | "low")}>
          <option value="recent">Newest first</option><option value="high">Largest gifts</option><option value="low">Smallest gifts</option>
        </select>
      </div>}
      {tab === "donors" ? (
        shownGifts.length === 0 ? (
          <p className="lc-none">{donations.length === 0 ? "No gifts yet. Yours could be the first." : "No public gifts match this filter."}{canJoin && <> Or <Link href={`/${campaign.slug}/join`}>start an ambassador page</Link> and invite friends.</>}</p>
        ) : (
          <ul className="ls-gifts">
            {shownGifts.slice(0, limit).map((d) => {
              const amb = d.ambassador_id ? names.get(d.ambassador_id) : null;
              const anon = d.display_name === "Anonymous";
              return (
                <li key={d.id}>
                  <span className={"ls-dot" + (anon ? " anon" : "")} aria-hidden="true">{anon ? "♥" : d.display_name.trim().charAt(0).toUpperCase()}</span>
                  <div className="ls-who">
                    <b>{d.display_name}</b>
                    <small>{timeAgo(d.created_at)}{amb ? ` · for ${amb}` : ""}</small>
                    {(d.dedication || d.message) && <p>{[d.dedication, d.message].filter(Boolean).join(" · ")}</p>}
                  </div>
                  <b className="ls-amt num">{money(d.amount * factor)}</b>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        <div className="ls-cards">
          {shownPeople.slice(0, limit).map((x) => {
            const rank = (people as { id: string }[]).findIndex((y) => y.id === x.id) + 1;
            const raised = x.raised * factor;
            const pct = x.goal ? Math.min(100, (raised / x.goal) * 100) : null;
            return (
              <Link key={x.id} href={tab === "teams" ? `/${campaign.slug}/team/${x.slug}` : `/${campaign.slug}/${x.slug}`} className="ls-card">
                <span className="ls-rank num">{rank}</span>
                <Avatar name={x.name} photo={x.photo_url} size={42} />
                <div className="ls-who">
                  <b>{x.name}</b>
                  {pct !== null && <div className="lc-mini" aria-hidden="true"><i style={{ width: `${pct.toFixed(1)}%` }} /></div>}
                  <small className="num">{money(raised)}{x.goal ? ` of ${money(x.goal)}` : ` · ${x.donors} donors`}</small>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {total === 0 && ql && <p className="lc-none">Nobody matches “{q}”.</p>}
      {total > limit && <button type="button" className="lc-more" onClick={() => setLimit(limit + 24)}>Show more</button>}
    </div>
  );
}
