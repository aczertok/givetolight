import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaignPage } from "@/lib/data";
import { money, SITE_URL } from "@/lib/format";
import { Avatar, Progress } from "@/components/Bits";
import DonorList from "@/components/DonorList";
import ShareBox from "@/components/ShareBox";

export const dynamic = "force-dynamic";

export default async function TeamPage({ params }: { params: Promise<{ campaign: string; team: string }> }) {
  const { campaign, team } = await params;
  const page = await getCampaignPage(campaign);
  const t = page?.teams.find((x) => x.slug === team);
  if (!page || !t) notFound();
  const c = page.campaign;
  const members = page.ambassadors.filter((a) => a.team_id === t.id);
  const ids = new Set(members.map((m) => m.id));
  const ds = page.donations.filter((d) => d.team_id === t.id || (d.ambassador_id && ids.has(d.ambassador_id)));
  const raised = t.raised * page.factor;
  const names = new Map(members.map((m) => [m.id, m.name]));
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div>
            <div className="crumbs"><Link href={`/${c.slug}`}>{c.name}</Link> · Team</div>
            <h1>{t.name}</h1>
            {t.blurb && <p className="lede">{t.blurb}</p>}
          </div>
          <aside className="tally">
            <div><div className="raised num">{money(raised)}</div><div className="of num">{t.goal ? `raised of ${money(t.goal)} team goal` : "raised"}</div></div>
            <Progress value={raised} goal={t.goal} />
            {c.status === "live" && <Link className="btn wide" href={`/${c.slug}/donate?t=${t.slug}`}>Donate to this team</Link>}
          </aside>
        </div>
      </section>
      <main className="page wrap">
        <h2 className="section-h" style={{ marginTop: 0 }}>Team ambassadors</h2>
        {members.length ? (
          <div className="grid">
            {members.map((a, i) => (
              <Link key={a.id} className="card" href={`/${c.slug}/${a.slug}`}>
                <div className="who"><Avatar name={a.name} photo={a.photo_url} /><div><div className="rank">#{i + 1}</div><h3>{a.name}</h3></div></div>
                <Progress value={a.raised * page.factor} goal={a.goal} small />
                <div className="row num"><b>{money(a.raised * page.factor)}</b><span className="meta">{a.goal ? `of ${money(a.goal)}` : ""}</span></div>
              </Link>
            ))}
          </div>
        ) : <div className="donors"><div className="empty">No ambassadors on this team yet. <Link href={`/ambassador?join=${c.slug}`}>Join the team</Link></div></div>}
        <div className="two" style={{ marginTop: 28 }}>
          <div><h2 className="section-h" style={{ marginTop: 0 }}>Donors</h2><DonorList donations={ds} factor={page.factor} names={names} /></div>
          <ShareBox url={`${SITE_URL}/${c.slug}/team/${t.slug}`} />
        </div>
      </main>
    </>
  );
}
