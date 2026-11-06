import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCampaignPage } from "@/lib/data";
import { money, paragraphs, SITE_URL } from "@/lib/format";
import { Progress } from "@/components/Bits";
import CampaignTabs from "@/components/CampaignTabs";
import Countdown from "@/components/Countdown";
import ShareBox from "@/components/ShareBox";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ campaign: string }> }): Promise<Metadata> {
  const { campaign } = await params;
  const p = await getCampaignPage(campaign).catch(() => null);
  return p ? { title: p.campaign.name, description: p.campaign.tagline || undefined, openGraph: p.campaign.cover_url ? { images: [p.campaign.cover_url] } : undefined } : {};
}

export default async function CampaignPage({ params }: { params: Promise<{ campaign: string }> }) {
  const { campaign: slug } = await params;
  const page = await getCampaignPage(slug);
  if (!page) notFound();
  const { campaign: c, total, donorCount } = page;
  const live = c.status === "live";
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div>
            {c.cover_url && <img className="cover" src={c.cover_url} alt="" />}
            <h1>{c.name}</h1>
            {c.tagline && <p className="lede">{c.tagline}</p>}
            {c.match_multiplier > 1 && <span className="match-tag">×{c.match_multiplier} · {c.match_note || "Every gift is matched"}</span>}
          </div>
          <aside className="tally">
            <div>
              <div className="raised num">{money(total)}</div>
              <div className="of num">{c.goal ? `raised of ${money(c.goal)} goal` : "raised"}</div>
            </div>
            <Progress value={total} goal={c.goal} />
            <div className="stats num">
              <div><b>{c.goal ? Math.round((total / c.goal) * 100) + "%" : "—"}</b><span>of goal</span></div>
              <div><b>{donorCount}</b><span>donors</span></div>
              <div><b>{page.ambassadors.length}</b><span>ambassadors</span></div>
            </div>
            {live ? <Link className="btn wide" href={`/${c.slug}/donate`}>Donate now</Link> : <div className="note-box" style={{ textAlign: "center" }}>This campaign has ended. Thank you to everyone who gave.</div>}
            {live && <Countdown endsAt={c.ends_at} />}
          </aside>
        </div>
      </section>
      <main className="page wrap">
        <CampaignTabs page={page} />
        <div className="two" style={{ marginTop: 32 }}>
          {paragraphs(c.story).length > 0 ? (
            <div className="story">{paragraphs(c.story).map((p, i) => <p key={i}>{p}</p>)}</div>
          ) : <div />}
          <ShareBox url={`${SITE_URL}/${c.slug}`} message={`Please support ${c.name} for The Lighthouse Project.`} />
        </div>
      </main>
    </>
  );
}
