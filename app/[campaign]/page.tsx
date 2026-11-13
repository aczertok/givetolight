import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCampaignPage } from "@/lib/data";
import { money, paragraphs, SITE_URL } from "@/lib/format";
import { Progress } from "@/components/Bits";
import CampaignTabs from "@/components/CampaignTabs";
import PremiumGiftCard from "@/components/PremiumGiftCard";
import Countdown from "@/components/Countdown";
import ShareBox from "@/components/ShareBox";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ campaign: string }> }): Promise<Metadata> {
  const { campaign } = await params;
  const p = await getCampaignPage(campaign).catch(() => null);
  return p ? {
    title: p.campaign.name,
    description: p.campaign.tagline || undefined,
    openGraph: p.campaign.cover_url ? { images: [p.campaign.cover_url] } : undefined,
  } : {};
}

export default async function CampaignPage({ params }: { params: Promise<{ campaign: string }> }) {
  const { campaign: slug } = await params;
  const page = await getCampaignPage(slug);
  if (!page) notFound();
  const { campaign: c, total, donorCount } = page;
  const live = c.status === "live";
  const draft = c.status === "draft";
  const percent = c.goal && c.goal > 0 ? Math.round(100 * total / c.goal) : null;
  const matchingAvailable = c.match_multiplier > 1 && (c.match_cap == null || page.matched < c.match_cap);
  const story = paragraphs(c.story);
  return (
    <div className="pv-page">
      {draft && <div className="draft-bar"><div className="wrap">Draft preview: only staff can see this page. Visitors see it once you set the campaign to <b>Live</b>. <Link href={`/admin/campaigns/${c.id}`}>Open in admin →</Link></div></div>}
      {live && matchingAvailable && (
        <div className="pv-match-banner"><span aria-hidden="true">✧</span> MATCHING GIFTS AVAILABLE <span aria-hidden="true">✧</span> <span className="pv-match-banner-sub">Eligible gifts may be matched up to {c.match_multiplier}× while funds last</span></div>
      )}
      <section className="pv-hero">
        <div className="wrap pv-hero-inner">
          <div className="pv-intro">
            <div className="pv-kicker"><span className="pv-status-dot" /> {live ? "FUNDRAISING NOW" : draft ? "DRAFT CAMPAIGN" : "CAMPAIGN COMPLETE"} <span className="pv-kicker-line" /><span>THE LIGHTHOUSE PROJECT</span></div>
            <h1>{c.name}</h1>
            {c.tagline && <p className="pv-tagline">{c.tagline}</p>}
            {(live || draft) && <Link className="pv-ambassador-hero" href={`/${c.slug}/join`}>Become an Ambassador <span aria-hidden="true">↗</span></Link>}
            <div className="pv-photo-space">
              {c.cover_url ? (
                <img className="pv-hero-image" src={c.cover_url} alt={`Campaign image for ${c.name}`} />
              ) : (
                <div className="pv-photo-placeholder" aria-label="Campaign image placeholder"><span>THE LIGHTHOUSE PROJECT</span><div>Every gift<br/>makes a difference.</div></div>
              )}
            </div>
            <div className="pv-progress-area">
              <div className="pv-total"><strong className="num">{money(total)}</strong><span>{c.goal ? `raised of ${money(c.goal)}` : "raised so far"}</span></div>
              <Progress value={total} goal={c.goal} />
              <div className="pv-progress-label">{percent !== null ? <span><b>{percent}%</b> of the goal reached</span> : <span>Thank you for your generosity</span>} {c.goal && total < c.goal && <span>{money(c.goal - total)} to go</span>}</div>
            </div>
            <div className="pv-social-proof">
              <div><strong className="num">{donorCount}</strong><span>supporters</span></div>
              <div><strong className="num">{page.ambassadors.length}</strong><span>ambassadors</span></div>
              <div><strong className="num">{page.teams.length}</strong><span>teams</span></div>
            </div>
            {live && <Countdown endsAt={c.ends_at} />}

            <div className="pv-under-hero-actions">
              <a href="#community">Meet our fundraisers <span aria-hidden="true">↓</span></a>
            </div>
          </div>
          {live ? (
            <PremiumGiftCard slug={c.slug} campaignName={c.name} presets={c.preset_amounts} matchMultiplier={c.match_multiplier} matchingAvailable={matchingAvailable}/>
          ) : (
            <aside className="pv-campaign-closed"><span>{draft ? "DRAFT PREVIEW" : "CAMPAIGN COMPLETED"}</span><h2>{draft ? "Your campaign is nearly ready." : "Thank you for your generosity."}</h2><p>{draft ? "Publish the campaign to activate donations." : "This campaign is no longer taking donations."}</p>{draft ? <Link href={`/admin/campaigns/${c.id}`} className="pv-give-button">Open in admin →</Link> : <Link href="/" className="pv-give-button">Other campaigns →</Link>}</aside>
          )}
        </div>
      </section>
      <main className="wrap pv-lower" id="community">
        <div className="pv-section-heading"><span>TOGETHER, WE MAKE AN IMPACT</span><h2>People coming together<br/><em>for something bigger.</em></h2></div>
        <CampaignTabs page={page} />
        <div className="pv-details">
          {story.length > 0 && <section className="pv-story"><h2>Why this matters</h2>{story.map((p,i) => <p key={i}>{p}</p>)}</section>}
          <section className="pv-share" id="share-campaign"><ShareBox url={`${SITE_URL}/${c.slug}`} message={`Please support ${c.name} for The Lighthouse Project.`}/></section>
        </div>
      </main>
    </div>
  );
}
