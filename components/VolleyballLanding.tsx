import Link from "next/link";
import GiveCard from "@/components/GiveCard";
import Supporters from "@/components/Community";
import ShareBox from "@/components/ShareBox";
import VolleyballArtwork from "@/components/VolleyballArtwork";
import { money, paragraphs, SITE_URL, timeLeft } from "@/lib/format";
import type { CampaignPage } from "@/lib/data";

export default function VolleyballLanding({ page }: { page: CampaignPage }) {
  const { campaign: c, total, donorCount } = page;
  const live = c.status === "live";
  const draft = c.status === "draft";
  const matching = c.match_multiplier > 1 && (c.match_cap == null || page.matched < c.match_cap);
  const pct = c.goal && c.goal > 0 ? Math.round((total / c.goal) * 100) : null;
  const remaining = c.goal != null ? Math.max(0, c.goal - total) : null;
  const story = paragraphs(c.story);
  const time = live ? timeLeft(c.ends_at) : null;

  return <div className="lc vf">
    {draft && <div className="draft-bar"><div className="wrap">Draft preview — only staff can see this campaign. <Link href={`/admin/campaigns/${c.id}`}>Open in admin →</Link></div></div>}
    {live && matching && <div className="vf-match-banner"><strong>{c.match_multiplier}× MATCHING AVAILABLE</strong><span>Eligible gifts may be matched up to {c.match_multiplier}× while matching funds remain.</span></div>}
    <main>
      <div className="vf-masthead">
        <section className="vf-hero" aria-labelledby="vf-title">
          <div className="vf-hero-copy">
            <div className="vf-hero-overline">THE MONSEY LIGHTHOUSE PRESENTS</div>
            <h1 id="vf-title"><span>VOLLEYBALL</span><span>TOURNAMENT</span></h1>
            <div className="vf-hero-brush"><strong>MEN'S NIGHT &amp; BBQ</strong><em>2027</em></div>
            <p className="vf-event-intro">Volleyball. The Grillfather. Live music. One unforgettable guys' night supporting the Lighthouse.</p>
            <div className="vf-event-badges"><span>MEN ONLY</span><span>BBQ</span><span>LIVE BAND</span></div>
          </div>
          <div className="vf-hero-art"><VolleyballArtwork /></div>
          <a className="vf-hero-donate-jump" href="#donate">MAKE A DONATION <span aria-hidden="true">↓</span></a>
        </section>
        <section className="vf-donation-band" aria-label="Fundraising progress and donation">
          <div className="vf-tally">
            <div className="vf-label">SUPPORT THE LIGHTHOUSE</div>
            <div className="vf-total num">{money(total)}</div>
            <div className="vf-total-sub">{c.goal ? <>raised of <strong>{money(c.goal)}</strong> goal</> : "raised so far"}</div>
            {c.goal && <div className="vf-progress" role="progressbar" aria-valuenow={Math.min(100, pct ?? 0)} aria-valuemin={0} aria-valuemax={100} aria-label="Fundraising goal progress"><div style={{width:`${Math.min(100,Math.max(0,pct ?? 0))}%`}}/></div>}
            <div className="vf-progress-legend">
              {pct !== null && <span><b>{pct}%</b> of goal</span>}
              {remaining !== null && remaining > 0 && <span>{money(remaining)} to go</span>}
            </div>
            <div className="vf-proof">
              <span><b>{donorCount.toLocaleString()}</b> supporters</span>
              <span><b>{page.ambassadors.length.toLocaleString()}</b> ambassadors</span>
              {time && time !== "Ended" && <span><b>{time.replace(" left","")}</b> left</span>}
            </div>
            <a className="vf-supporters-jump" href="#supporters">See who's behind the campaign <span aria-hidden="true">↘</span></a>
          </div>
          <div className="vf-gift-column">
            {live ? <GiveCard slug={c.slug} presets={c.preset_amounts} matchMultiplier={c.match_multiplier} matchingAvailable={matching} daf={!!process.env.NEXT_PUBLIC_CHARIOT_CID} title="Make your gift" oneTimeOnly/> :
              <div className="lc-give lc-closed"><div className="lc-give-body"><h2>{draft ? "Preview your campaign" : "This campaign has ended"}</h2><p>{draft ? "Publish the campaign to start accepting donations." : "Thank you for supporting the Lighthouse."}</p>{draft && <Link className="lc-cta" href={`/admin/campaigns/${c.id}`}>Open in admin</Link>}</div></div>}
          </div>
        </section>
      </div>
      <section className="vf-lineup" aria-label="Event features">
        <div className="vf-lineup-inner">
          <div><span className="vf-lineup-num">01</span><span><strong>THE TOURNAMENT</strong><small>Bring your game</small></span></div>
          <div><span className="vf-lineup-num">02</span><span><strong>BBQ BY THE GRILLFATHER</strong><small>Fire up the grill</small></span></div>
          <div><span className="vf-lineup-num">03</span><span><strong>LIVE BAND</strong><small>Music all night</small></span></div>
        </div>
      </section>
      <section className="vf-community lc-wrap" id="supporters">
        <div className="vf-section-heading"><div><span>THE PEOPLE MAKING IT HAPPEN</span><h2>Supporters &amp; fundraising teams</h2></div><a href="#donate">Donate to the campaign ↗</a></div>
        <Supporters page={page} canJoin={live || draft} donationFilters/>
      </section>
      {story.length > 0 && <section className="vf-about lc-wrap" id="about"><div><span>WHAT YOUR GIFT SUPPORTS</span><h2>Why the Lighthouse matters</h2></div><div>{story.map((p,i)=><p key={i}>{p}</p>)}</div></section>}
      {(live || draft) && <section className="vf-ambassadors" id="join"><div className="vf-ambassadors-inner"><div className="vf-ambassadors-kicker">GET YOUR TEAM IN THE GAME</div><h2>DON'T JUST WATCH.<br/><em>LEAD THE CHARGE.</em></h2><p>Create your own fundraising page, rally your friends, and help make Volleyball 2027 a success.</p><Link href={`/${c.slug}/join`} className="vf-ambassadors-button">BECOME AN AMBASSADOR <span aria-hidden="true">↗</span></Link></div></section>}
      <section className="vf-share lc-wrap"><ShareBox url={`${SITE_URL}/${c.slug}`} message={`Support The Monsey Lighthouse Volleyball 2027 fundraiser.`}/></section>
    </main>
  </div>;
}
