import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCampaignPage } from "@/lib/data";
import { money, paragraphs, SITE_URL } from "@/lib/format";
import { Avatar, Progress } from "@/components/Bits";
import DonorList from "@/components/DonorList";
import ShareBox from "@/components/ShareBox";

export const dynamic = "force-dynamic";

async function load(campaign: string, ambassador: string) {
  const page = await getCampaignPage(campaign);
  const a = page?.ambassadors.find((x) => x.slug === ambassador);
  return page && a ? { page, a } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ campaign: string; ambassador: string }> }): Promise<Metadata> {
  const { campaign, ambassador } = await params;
  const r = await load(campaign, ambassador).catch(() => null);
  return r ? { title: `${r.a.name} · ${r.page.campaign.name}`, openGraph: r.a.photo_url ? { images: [r.a.photo_url] } : undefined } : {};
}

export default async function AmbassadorPage({ params }: { params: Promise<{ campaign: string; ambassador: string }> }) {
  const { campaign, ambassador } = await params;
  const r = await load(campaign, ambassador);
  if (!r) notFound();
  const { page, a } = r;
  const c = page.campaign;
  const mine = page.donations.filter((d) => d.ambassador_id === a.id);
  const raised = a.raised * page.factor;
  const team = a.team_id ? page.teams.find((t) => t.id === a.team_id) : null;
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div>
            <div className="crumbs"><Link href={`/${c.slug}`}>{c.name}</Link>{team && <> · <Link href={`/${c.slug}/team/${team.slug}`}>{team.name}</Link></>}</div>
            {a.photo_url ? <img className="photo-lg" src={a.photo_url} alt="" /> : <div style={{ marginBottom: 14 }}><Avatar name={a.name} size={88} /></div>}
            <h1>{a.name}</h1>
            {c.match_multiplier > 1 && <span className="match-tag">×{c.match_multiplier} matched</span>}
          </div>
          <aside className="tally">
            <div>
              <div className="raised num">{money(raised)}</div>
              <div className="of num">{a.goal ? `raised of ${money(a.goal)} personal goal` : "raised"}</div>
            </div>
            <Progress value={raised} goal={a.goal} />
            <div className="stats num">
              <div><b>{a.goal ? Math.round((raised / a.goal) * 100) + "%" : "—"}</b><span>of goal</span></div>
              <div><b>{mine.length}</b><span>donors</span></div>
              <div><b>#{page.ambassadors.indexOf(a) + 1}</b><span>of {page.ambassadors.length}</span></div>
            </div>
            {c.status === "live" && <Link className="btn wide" href={`/${c.slug}/donate?a=${a.slug}`}>Donate to {a.name.split(" ")[0]}&apos;s page</Link>}
          </aside>
        </div>
      </section>
      <main className="page wrap two">
        <div>
          {paragraphs(a.story).length > 0 && <div className="story" style={{ marginBottom: 20 }}>{paragraphs(a.story).map((p, i) => <p key={i}>{p}</p>)}</div>}
          <h2 className="section-h" style={{ marginTop: 0 }}>Donors</h2>
          <DonorList donations={mine} factor={page.factor} />
        </div>
        <ShareBox url={`${SITE_URL}/${c.slug}/${a.slug}`} message={`I'm raising money for The Lighthouse Project's ${c.name}. Every gift helps the girls. Please support my page:`} />
      </main>
    </>
  );
}
