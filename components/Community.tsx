"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar } from "@/components/Bits";
import { money, timeAgo } from "@/lib/format";
import type { CampaignPage } from "@/lib/data";

function Bar({ value, goal }: { value: number; goal: number | null }) {
  if (!goal) return null;
  const p = Math.min(100, (value / goal) * 100);
  return <div className="lc-mini" aria-hidden="true"><i style={{ width: `${p.toFixed(1)}%` }} /></div>;
}

export function FundraiserBoard({ page, canJoin }: { page: CampaignPage; canJoin: boolean }) {
  const { ambassadors, teams, factor, campaign } = page;
  const [tab, setTab] = useState<"ambassadors" | "teams">(ambassadors.length || !teams.length ? "ambassadors" : "teams");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(12);
  const list = tab === "ambassadors" ? ambassadors : teams;
  const ql = q.trim().toLowerCase();
  const rows = list.filter((x) => !ql || x.name.toLowerCase().includes(ql) || ("teamName" in x && x.teamName?.toLowerCase().includes(ql)));

  if (!ambassadors.length && !teams.length) {
    return (
      <div className="lc-empty-board">
        <h3>Be the first ambassador</h3>
        <p>Make your own page in two minutes, share it with friends and family, and watch your total grow on this board.</p>
        {canJoin && <Link className="lc-btn" href={`/${campaign.slug}/join`}>Start my page</Link>}
      </div>
    );
  }

  return (
    <div className="lc-board">
      <div className="lc-board-bar">
        <div className="lc-seg" role="tablist" aria-label="Fundraisers">
          <button role="tab" type="button" aria-selected={tab === "ambassadors"} onClick={() => { setTab("ambassadors"); setLimit(12); }}>Ambassadors <span className="num">{ambassadors.length}</span></button>
          <button role="tab" type="button" aria-selected={tab === "teams"} onClick={() => { setTab("teams"); setLimit(12); }}>Teams <span className="num">{teams.length}</span></button>
        </div>
        <input className="lc-search" type="search" placeholder={tab === "teams" ? "Find a team" : "Find a fundraiser"} aria-label="Search fundraisers" value={q} onChange={(e) => { setQ(e.target.value); setLimit(12); }} />
      </div>
      {rows.length === 0 ? <p className="lc-none">No {tab} match “{q}”.</p> : (
        <div className="lc-cards">
          {rows.slice(0, limit).map((x) => {
            const rank = (list as { id: string }[]).findIndex((y) => y.id === x.id) + 1;
            const raised = x.raised * factor;
            const href = tab === "teams" ? `/${campaign.slug}/team/${x.slug}` : `/${campaign.slug}/${x.slug}`;
            return (
              <Link key={x.id} href={href} className="lc-card">
                <div className="lc-card-top">
                  <Avatar name={x.name} photo={x.photo_url} size={46} />
                  <div className="lc-card-name">
                    <b>{x.name}</b>
                    <small>{"teamName" in x && x.teamName ? x.teamName : `${x.donors} ${x.donors === 1 ? "donor" : "donors"}`}</small>
                  </div>
                  {rank <= 3 && !ql ? <span className={`lc-medal m${rank}`} aria-label={`Rank ${rank}`}>{rank}</span> : <span className="lc-rank num">#{rank}</span>}
                </div>
                <Bar value={raised} goal={x.goal} />
                <div className="lc-card-foot num">
                  <b>{money(raised)}</b>
                  <span>{x.goal ? `${Math.min(999, Math.round((raised / x.goal) * 100))}% of ${money(x.goal)}` : "raised"}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {rows.length > limit && <button type="button" className="lc-more" onClick={() => setLimit(limit + 24)}>Show more {tab}</button>}
    </div>
  );
}

export function DonorWall({ page }: { page: CampaignPage }) {
  const { donations, factor, ambassadors } = page;
  const names = useMemo(() => new Map(ambassadors.map((a) => [a.id, a.name])), [ambassadors]);
  const [sort, setSort] = useState<"recent" | "top">("recent");
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(10);
  const ql = q.trim().toLowerCase();
  const rows = useMemo(() => {
    const r = donations.filter((d) => !ql || d.display_name.toLowerCase().includes(ql) || (d.ambassador_id && names.get(d.ambassador_id)?.toLowerCase().includes(ql)));
    return sort === "top" ? [...r].sort((a, b) => b.amount - a.amount) : r;
  }, [donations, ql, sort, names]);

  if (!donations.length) return <div className="lc-wall"><p className="lc-none">No gifts yet. Yours could be the first one on this wall.</p></div>;
  return (
    <div className="lc-wall">
      <div className="lc-board-bar">
        <div className="lc-seg" role="group" aria-label="Sort donors">
          <button type="button" aria-pressed={sort === "recent"} onClick={() => setSort("recent")}>Recent</button>
          <button type="button" aria-pressed={sort === "top"} onClick={() => setSort("top")}>Top gifts</button>
        </div>
        <input className="lc-search" type="search" placeholder="Search donors" aria-label="Search donors" value={q} onChange={(e) => { setQ(e.target.value); setLimit(10); }} />
      </div>
      <ul className="lc-gifts">
        {rows.slice(0, limit).map((d) => {
          const amb = d.ambassador_id ? names.get(d.ambassador_id) : null;
          const anon = d.display_name === "Anonymous";
          return (
            <li key={d.id}>
              <span className={"lc-gift-dot" + (anon ? " anon" : "")} aria-hidden="true">{anon ? "♥" : d.display_name.trim().charAt(0).toUpperCase()}</span>
              <div className="lc-gift-who">
                <b>{d.display_name}</b>
                <small>{timeAgo(d.created_at)}{amb ? ` · for ${amb}` : ""}{d.plan === "monthly" ? " · monthly" : ""}</small>
                {(d.dedication || d.message) && <p>{[d.dedication, d.message].filter(Boolean).join(" · ")}</p>}
              </div>
              <b className="lc-gift-amt num">{money(d.amount * factor)}</b>
            </li>
          );
        })}
      </ul>
      {rows.length === 0 && <p className="lc-none">No donors match “{q}”.</p>}
      {rows.length > limit && <button type="button" className="lc-more" onClick={() => setLimit(limit + 25)}>Show more donors</button>}
      {factor > 1 && <p className="lc-fine">Amounts shown include matching.</p>}
    </div>
  );
}
