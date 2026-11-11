import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCampaignPage } from "@/lib/data";
import { money, paragraphs, SITE_URL } from "@/lib/format";
import { Progress } from "@/components/Bits";
import CampaignTabs from "@/components/CampaignTabs";
import CampaignQuickDonate from "@/components/CampaignQuickDonate";
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
  const percentage = c.goal && c.goal > 0 ? Math.round((total / c.goal) * 100) : null;

  return (
    <div className="gl-campaign-v2">
      {live && c.match_multiplier > 1 && (
        <div className="gl-campaign-match-ribbon">
          <span aria-hidden="true">✦</span> {c.match_note || `Your gift can make ${c.match_multiplier}× the impact`}
        </div>
      )}
      <section className="gl-campaign-first">
        <div className="wrap">
          <div className="gl-campaign-overline">
            <span className="gl-campaign-live-dot" /> {live ? "CAMPAIGN LIVE" : "CAMPAIGN ENDED"}
            <span className="gl-campaign-slug">{c.slug}</span>
          </div>
          <div className="gl-campaign-two-column">
            <div className="gl-campaign-intro">
              {c.cover_url && <img className="gl-campaign-cover" src={c.cover_url} alt="" />}
              <p className="gl-campaign-category">GIVE TO LIGHT / {c.name.toUpperCase()}</p>
              <h1>{c.name}</h1>
              {c.tagline && <p className="gl-campaign-subtitle">{c.tagline}</p>}
              <div className="gl-campaign-raised-block">
                <div className="gl-campaign-raised-number num">{money(total)}</div>
                <div className="gl-campaign-raised-description">{c.goal ? `raised of ${money(c.goal)} goal` : "raised so far"}</div>
                <Progress value={total} goal={c.goal} />
                {percentage !== null && (
                  <div className="gl-campaign-progress-foot"><span>{percentage}% of goal</span><span>{total < c.goal! ? `${money(c.goal! - total)} to go` : "Goal reached!"}</span></div>
                )}
              </div>
              <div className="gl-campaign-highlights">
                <div><strong>{donorCount}</strong><span>Supporters</span></div>
                <div><strong>{page.ambassadors.length}</strong><span>Ambassadors</span></div>
                <div><strong>{page.teams.length}</strong><span>Teams</span></div>
              </div>
              {live && <Countdown endsAt={c.ends_at} />}
              {!live && <div className="gl-campaign-ended">This campaign has ended. Thank you for your support.</div>}
              <div className="gl-campaign-inline-actions">
                <a href="#community">Explore teams &amp; ambassadors ↓</a>
                <a href="#share-campaign">Share this campaign ↗</a>
              </div>
            </div>
            {live ? (
              <CampaignQuickDonate slug={c.slug} presets={c.preset_amounts} matchMultiplier={c.match_multiplier} matchingAvailable={c.match_multiplier > 1} />
            ) : (
              <div className="gl-campaign-ended-card">
                <span>CAMPAIGN COMPLETE</span>
                <h2>Thank you for making an impact.</h2>
                <p>Explore other active campaigns to keep the giving going.</p>
                <Link className="btn" href="/">Explore campaigns ↗</Link>
              </div>
            )}
          </div>
        </div>
      </section>
      <main className="page wrap gl-campaign-lower" id="community">
        <div className="gl-campaign-section-title">
          <span>THE PEOPLE BEHIND THE PROGRESS</span>
          <h2>Every gift adds up.</h2>
        </div>
        <CampaignTabs page={page} />
        <div className="two gl-campaign-bottom" style={{ marginTop: 32 }}>
          {paragraphs(c.story).length > 0 ? (
            <section className="story"><h2 className="section-h" style={{ marginTop: 0 }}>About the campaign</h2>{paragraphs(c.story).map((p, i) => <p key={i}>{p}</p>)}</section>
          ) : <div />}
          <div id="share-campaign"><ShareBox url={`${SITE_URL}/${c.slug}`} message={`Please support ${c.name} for The Lighthouse Project.`} /></div>
        </div>
      </main>
    </div>
  );
}
