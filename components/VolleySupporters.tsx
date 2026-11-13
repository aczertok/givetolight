"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avatar, Progress } from "@/components/Bits";
import { money, timeAgo } from "@/lib/format";
import type { CampaignPage } from "@/lib/data";

type Filter = "all" | "1000" | "500" | "180" | "under";
type Board = "ambassadors" | "teams";
export default function VolleySupporters({ page }: { page: CampaignPage }) {
  const { donations, factor, teams, ambassadors, campaign } = page;
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "largest" | "smallest">("newest");
  const [limit, setLimit] = useState(12);
  const [board, setBoard] = useState<Board>("ambassadors");
  const names = useMemo(() => new Map(ambassadors.map(a => [a.id, a.name])), [ambassadors]);
  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return donations.filter(d => {
      const amount = Number(d.amount);
      const fits = filter === "all" || filter === "1000" && amount >= 1000 ||
        filter === "500" && amount >= 500 && amount < 1000 ||
        filter === "180" && amount >= 180 && amount < 500 ||
        filter === "under" && amount < 180;
      return fits && (!query || d.display_name.toLowerCase().includes(query) ||
        (d.ambassador_id && names.get(d.ambassador_id)?.toLowerCase().includes(query)));
    }).sort((a, b) => sort === "largest" ? b.amount - a.amount :
       sort === "smallest" ? a.amount - b.amount :
       new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [donations, filter, search, sort, names]);
  const ranking = board === "ambassadors" ? ambassadors : teams;
  return <section className="vb-community" id="community">
    <div className="vb-community-head">
      <div><span className="vb-section-kicker">THE PEOPLE BEHIND THE CAMPAIGN</span><h2>Every gift counts.</h2></div>
      <a href="#donate" className="vb-text-donate">Make a donation →</a>
    </div>
    <div className="vb-community-grid">
      <section className="vb-community-panel" aria-label="Campaign donations">
        <div className="vb-panel-head"><h3>Donations</h3><span className="vb-tally">{filtered.length} {filtered.length === 1 ? "gift" : "gifts"}</span></div>
        <div className="vb-filters" aria-label="Filter donations by amount">
          {([["all","All"],["1000","$1,000+"],["500","$500–999"],["180","$180–499"],["under","Under $180"]] as const).map(([value,label]) =>
            <button key={value} type="button" aria-pressed={filter === value} onClick={() => { setFilter(value); setLimit(12); }}>{label}</button>
          )}
        </div>
        <div className="vb-list-controls">
          <input type="search" placeholder="Search public donors" aria-label="Search donors" value={search} onChange={e => { setSearch(e.target.value); setLimit(12); }}/>
          <select aria-label="Sort donations" value={sort} onChange={e => setSort(e.target.value as typeof sort)}>
            <option value="newest">Most recent</option><option value="largest">Largest gift</option><option value="smallest">Smallest gift</option>
          </select>
        </div>
        <div className="vb-donor-list">
          {filtered.slice(0,limit).map(d => <div key={d.id} className="vb-donor-row">
            <div className="vb-donor-avatar" aria-hidden="true">{d.display_name === "Anonymous" ? "♥" : d.display_name.trim().charAt(0).toUpperCase()}</div>
            <div className="vb-donor-info"><strong>{d.display_name}</strong><small>{timeAgo(d.created_at)}{d.ambassador_id && names.get(d.ambassador_id) ? ` · For ${names.get(d.ambassador_id)}` : ""}</small>
              {(d.dedication || d.message) && <span>{[d.dedication,d.message].filter(Boolean).join(" · ")}</span>}</div>
            <strong className="vb-donor-money">{money(d.amount * factor)}</strong>
          </div>)}
          {filtered.length === 0 && <p className="vb-empty">No public gifts match this filter.</p>}
        </div>
        {filtered.length > limit && <button className="vb-show-more" type="button" onClick={() => setLimit(limit + 20)}>Show more donations ↓</button>}
        {factor > 1 && <p className="vb-match-disclaimer">Displayed totals include applicable campaign matching.</p>}
      </section>
      <section className="vb-community-panel" aria-label="Fundraising leaderboard">
        <div className="vb-panel-head"><h3>Leaderboard</h3><select aria-label="Leaderboard category" value={board} onChange={e => setBoard(e.target.value as Board)}>
          <option value="ambassadors">Ambassadors</option><option value="teams">Teams</option>
        </select></div>
        {ranking.slice(0,10).map((person,i) => <Link key={person.id} className="vb-rank-row"
          href={board === "teams" ? `/${campaign.slug}/team/${person.slug}` : `/${campaign.slug}/${person.slug}`}>
          <span className="vb-rank-index">{i+1}</span><Avatar name={person.name} photo={person.photo_url}/>
          <span className="vb-rank-name">{person.name}<small>{person.donors} supporters</small></span>
          <strong>{money(person.raised * factor)}</strong>
        </Link>)}
        {ranking.length === 0 && <p className="vb-empty">No {board} yet.</p>}
        <Link href={`/${campaign.slug}/join`} className="vb-rank-join">Join the fundraising effort ↗</Link>
      </section>
    </div>
  </section>;
}
