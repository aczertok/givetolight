"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { money } from "@/lib/format";
import { Avatar, Progress } from "@/components/Bits";
import DonorList from "@/components/DonorList";
import type { CampaignPage } from "@/lib/data";

export default function CampaignTabs({ page }: { page: CampaignPage }) {
  const { campaign, teams, ambassadors, donations, factor } = page;
  const [tab, setTab] = useState(ambassadors.length ? "ambassadors" : teams.length ? "teams" : "donors");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(60);
  const names = useMemo(() => new Map(ambassadors.map((a) => [a.id, a.name])), [ambassadors]);
  const ql = q.trim().toLowerCase();
  const tabs: [string, string][] = [];
  if (ambassadors.length) tabs.push(["ambassadors", `Ambassadors (${ambassadors.length})`]);
  if (teams.length) tabs.push(["teams", `Teams (${teams.length})`]);
  tabs.push(["donors", `Donors (${donations.length})`]);

  return (
    <>
      <div className="tabs" role="tablist">
        {tabs.map(([k, l]) => (
          <button key={k} className="tab" role="tab" aria-selected={tab === k} onClick={() => { setTab(k); setQ(""); }}>{l}</button>
        ))}
      </div>
      {tab !== "teams" && (
        <div className="toolbar">
          <input className="search" placeholder={tab === "donors" ? "Search donors" : "Find an ambassador"} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search" />
          {tab === "ambassadors" && campaign.status === "live" && <Link className="btn ghost" href={`/ambassador?join=${campaign.slug}`}>Become an ambassador</Link>}
        </div>
      )}
      {tab === "ambassadors" && (
        <div className="grid">
          {ambassadors.filter((a) => !ql || a.name.toLowerCase().includes(ql)).map((a, i) => (
            <Link key={a.id} className="card" href={`/${campaign.slug}/${a.slug}`}>
              <div className="who">
                <Avatar name={a.name} photo={a.photo_url} />
                <div><div className="rank">#{ambassadors.indexOf(a) + 1 || i + 1}</div><h3>{a.name}</h3>{a.teamName && <div className="meta">{a.teamName}</div>}</div>
              </div>
              <Progress value={a.raised * factor} goal={a.goal} small />
              <div className="row num"><b>{money(a.raised * factor)}</b><span className="meta">{a.goal ? `of ${money(a.goal)}` : `${a.donors} donors`}</span></div>
            </Link>
          ))}
        </div>
      )}
      {tab === "teams" && (
        <div className="grid">
          {teams.map((t, i) => (
            <Link key={t.id} className="card" href={`/${campaign.slug}/team/${t.slug}`}>
              <div className="who"><Avatar name={t.name} photo={t.photo_url} /><div><div className="rank">#{i + 1}</div><h3>{t.name}</h3></div></div>
              <div className="meta">{ambassadors.filter((a) => a.team_id === t.id).length} ambassadors · {t.donors} donors</div>
              <Progress value={t.raised * factor} goal={t.goal} small />
              <div className="row num"><b>{money(t.raised * factor)}</b><span className="meta">{t.goal ? `of ${money(t.goal)}` : ""}</span></div>
            </Link>
          ))}
        </div>
      )}
      {tab === "donors" && (
        <>
          <DonorList
            donations={donations.filter((d) => !ql || d.display_name.toLowerCase().includes(ql) || (d.ambassador_id && names.get(d.ambassador_id)?.toLowerCase().includes(ql)))}
            factor={factor}
            names={names}
            limit={shown}
          />
          {donations.length > shown && !ql && <div style={{ textAlign: "center", marginTop: 12 }}><button className="btn ghost" onClick={() => setShown(shown + 100)}>Show more donors</button></div>}
        </>
      )}
    </>
  );
}
