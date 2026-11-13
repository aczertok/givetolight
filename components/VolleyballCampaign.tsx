import Link from "next/link";
import { money, paragraphs, SITE_URL } from "@/lib/format";
import { Progress } from "@/components/Bits";
import Countdown from "@/components/Countdown";
import ShareBox from "@/components/ShareBox";
import VolleyGift from "@/components/VolleyGift";
import VolleySupporters from "@/components/VolleySupporters";
import type { CampaignPage } from "@/lib/data";

export default function VolleyballCampaign({ page }: { page: CampaignPage }) {
  const { campaign: c, total, donorCount } = page;
  const live = c.status === "live";
  const draft = c.status === "draft";
  const matched = c.match_multiplier > 1 && (c.match_cap == null || page.matched < c.match_cap);
  const percent = c.goal && c.goal > 0 ? Math.round(total / c.goal * 100) : null;
  const story = paragraphs(c.story);
  return <div className="vb-landing">
    {draft && <div className="draft-bar"><div className="wrap">Draft preview: only staff can see this page. <Link href={`/admin/campaigns/${c.id}`}>Manage campaign ↗</Link></div></div>}
    {live && matched && <div className="vb-match-banner">MATCHING AVAILABLE <span>Eligible gifts may be matched up to {c.match_multiplier}× while funds last</span></div>}
    <section className="vb-hero" id="event">
      <div className="vb-hero-content">
        <div className="vb-eyebrow">THE MONSEY LIGHTHOUSE PRESENTS</div>
        <h1>VOLLEYBALL<br/>TOURNAMENT <span>2027</span></h1>
        <div className="vb-event-subtitle">MEN'S NIGHT &amp; BBQ</div>
        <div className="vb-hero-meta">
          <span>MEN ONLY EVENT</span><span>VOLLEYBALL</span><span>BBQ</span><span>LIVE BAND</span>
        </div>
        <p className="vb-hero-caption">A night out with the guys. A tournament worth playing. All in support of The Lighthouse.</p>
      </div>
      <div className="vb-hero-visual">
        {c.cover_url ? <img src={c.cover_url} alt={`Volleyball 2027 campaign artwork`} /> :
          <div className="vb-volley-art" aria-hidden="true">
            <div className="vb-art-glow"/><div className="vb-art-ball"><i/><i/><i/></div><div className="vb-art-net"/>
          </div>}
        <div className="vb-hero-image-label">2027 • LIGHTHOUSE VOLLEYBALL</div>
      </div>
    </section>
    <div className="vb-event-strip">
      <span><strong>VOLLEYBALL</strong><small>Men's tournament</small></span>
      <span><strong>BBQ</strong><small>Food by The Grillfather</small></span>
      <span><strong>LIVE BAND</strong><small>Music throughout the night</small></span>
    </div>
    <section className="vb-main-donation" aria-label="Campaign donations and giving">
      <div className="vb-campaign-progress">
        <div className="vb-kicker">SUPPORT THE LIGHTHOUSE</div>
        <h2>Make this tournament count.</h2>
        <div className="vb-raised">{money(total)}</div>
        <div className="vb-goal">Raised {c.goal ? `of ${money(c.goal)} goal` : "so far"}</div>
        <Progress value={total} goal={c.goal}/>
        <div className="vb-progress-copy"><span>{percent !== null ? `${percent}% of goal` : "Every gift counts"}</span>{c.goal != null && total < c.goal && <span>{money(c.goal-total)} to go</span>}</div>
        <div className="vb-stat-row"><span><strong>{donorCount}</strong> donors</span><span><strong>{page.ambassadors.length}</strong> ambassadors</span><span><strong>{page.teams.length}</strong> teams</span></div>
        {live && <Countdown endsAt={c.ends_at}/>}
      </div>
      {live ? <VolleyGift slug={c.slug} presets={c.preset_amounts} matchMultiplier={c.match_multiplier} matchingAvailable={matched}/> :
        <div className="vb-closed"><h2>{draft ? "Campaign preview" : "This campaign has ended"}</h2><p>{draft ? "Publish the campaign to accept donations." : "Thank you for supporting The Lighthouse."}</p>{draft && <Link href={`/admin/campaigns/${c.id}`}>Manage campaign →</Link>}</div>}
    </section>
    <section className="vb-story-section" id="about">
      <div className="vb-story-heading"><span>ABOUT THE EVENT</span><h2>More than a tournament.</h2></div>
      <div className="vb-story-grid">
        <div className="vb-story-copy">
          <p>Volleyball, BBQ, a live band and an evening with friends — all coming together to support the programs and community at The Monsey Lighthouse.</p>
          {story.map((p,i)=><p key={i}>{p}</p>)}
        </div>
        <div className="vb-event-features"><span>01 <strong>Volleyball tournament</strong></span><span>02 <strong>BBQ by The Grillfather</strong></span><span>03 <strong>Live band &amp; guys' night</strong></span></div>
      </div>
    </section>
    <VolleySupporters page={page}/>
    <section className="vb-ambassador-final" id="join">
      <div className="vb-ambassador-inner">
        <div className="vb-ambassador-kicker">JOIN THE TEAM</div>
        <h2>Become an Ambassador.</h2>
        <p>Start your own fundraising page, invite friends to give, and help make the 2027 tournament a success.</p>
        <Link href={`/${c.slug}/join`} className="vb-ambassador-cta">BECOME AN AMBASSADOR <span aria-hidden="true">↗</span></Link>
      </div>
    </section>
    <section className="vb-share-section"><ShareBox url={`${SITE_URL}/${c.slug}`} message={`Support The Monsey Lighthouse Volleyball 2027 campaign.`}/></section>
  </div>;
}
