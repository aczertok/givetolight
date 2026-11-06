import Link from "next/link";
import { listCampaigns } from "@/lib/data";
import { money, ORG_NAME } from "@/lib/format";
import { Progress } from "@/components/Bits";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const campaigns = await listCampaigns().catch(() => []);
  const live = campaigns.filter((c) => c.status === "live");
  const past = campaigns.filter((c) => c.status === "ended");
  return (
    <>
      <section className="hero">
        <div className="wrap" style={{ gridTemplateColumns: "1fr" }}>
          <div>
            <h1>A place of their own, kept lit by this community.</h1>
            <p className="lede">{ORG_NAME} gives young women ages 15–25 in Monsey and Pomona weekly groups, mentors and programming all year round. Every campaign here keeps those doors open.</p>
          </div>
        </div>
      </section>
      <main className="page wrap">
        {!supabaseConfigured() && <p className="note-box">The site isn&apos;t connected to its database yet. Campaigns appear here once setup is finished.</p>}
        <h2 className="section-h" style={{ marginTop: 0 }}>Live now</h2>
        {live.length ? (
          <div className="grid">{live.map((c) => <CampaignCard key={c.id} c={c} />)}</div>
        ) : (
          <div className="donors"><div className="empty">No campaign is live right now. The next one will open here.</div></div>
        )}
        {past.length > 0 && (
          <>
            <h2 className="section-h">Past campaigns</h2>
            <div className="grid">{past.map((c) => <CampaignCard key={c.id} c={c} />)}</div>
          </>
        )}
      </main>
    </>
  );
}

function CampaignCard({ c }: { c: Awaited<ReturnType<typeof listCampaigns>>[number] }) {
  return (
    <Link className="card" href={`/${c.slug}`}>
      {c.cover_url && <img src={c.cover_url} alt="" style={{ aspectRatio: "16/9", objectFit: "cover", borderRadius: 8 }} />}
      <h3>{c.name}</h3>
      {c.tagline && <div className="meta">{c.tagline}</div>}
      <Progress value={c.total} goal={c.goal} small />
      <div className="row num"><b>{money(c.total)}</b><span className="meta">{c.goal ? `of ${money(c.goal)}` : `${c.donors} donors`}</span></div>
      {c.status === "live" && <span className="btn sm" style={{ justifySelf: "start" }}>Donate</span>}
    </Link>
  );
}
