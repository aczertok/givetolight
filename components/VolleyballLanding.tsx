import Link from "next/link";
import GiveCard from "@/components/GiveCard";
import Supporters from "@/components/Community";
import ShareBox from "@/components/ShareBox";
import EventPoster from "@/components/EventPoster";
import { money, paragraphs, SITE_URL, timeLeft } from "@/lib/format";
import type { CampaignPage } from "@/lib/data";

export default function VolleyballLanding({ page }: { page: CampaignPage }) {
  const { campaign: c, total, donorCount } = page;
  const live = c.status === "live";
  const draft = c.status === "draft";
  const matching = c.match_multiplier > 1 && (c.match_cap == null || page.matched < c.match_cap);
  const percent = c.goal && c.goal > 0 ? Math.round(total / c.goal * 100) : null;
  const remaining = c.goal != null ? Math.max(0, c.goal - total) : null;
  const stories = paragraphs(c.story);
  const time = live ? timeLeft(c.ends_at) : null;

  return (
    <div className="lc vl">
      {draft && <div className="draft-bar"><div className="wrap">Draft preview — only staff can see this campaign. <Link href={`/admin/campaigns/${c.id}`}>Open in admin →</Link></div></div>}
      {live && matching && <div className="vl-match-line"><strong>{c.match_multiplier}× MATCHING AVAILABLE</strong><span>Eligible donations may be matched up to {c.match_multiplier}× while matching funds remain.</span></div>}
      <main>
        <section className="vl-main" aria-label="Volleyball fundraiser">
          <div className="vl-scene">
            <div className="vl-scene-inner">
              <div className="vl-eyebrow">THE MONSEY LIGHTHOUSE PRESENTS <span className="vl-eyebrow-rule" /></div>
              <h1>VOLLEYBALL<br/>TOURNAMENT <span>2027</span></h1>
              <div className="vl-night-tag">MEN'S NIGHT <span>&amp;</span> BBQ</div>
              <p className="vl-event-tagline">Volleyball. The Grillfather BBQ. Live band. One night for The Lighthouse.</p>
              <div className="vl-event-chips"><span>MEN ONLY</span><span>VOLLEYBALL</span><span>BBQ BY THE GRILLFATHER</span><span>LIVE BAND</span></div>
              <div className="vl-scene-visual">
                <EventPoster kind="volleyball" kicker="" title="" line={null} cover={c.cover_url}/>
              </div>
            </div>
          </div>
          <div className="vl-donation-area">
            <div className="vl-amount-intro">
              <div className="vl-label">VOLLEYBALL 2027 FUNDRAISER</div>
              <h2>Support the Lighthouse.</h2>
              <div className="vl-raised num">{money(total)}</div>
              <p className="vl-goal">{c.goal ? <>raised of <strong>{money(c.goal)}</strong> goal</> : "raised so far"}</p>
              {c.goal && <div className="vl-progress" role="progressbar" aria-valuenow={Math.min(100, percent ?? 0)} aria-valuemin={0} aria-valuemax={100} aria-label="Campaign progress"><div style={{ width: `${Math.min(100, Math.max(0, percent ?? 0))}%` }}/></div>}
              <div className="vl-progress-caption">
                {percent !== null && <span><b>{percent}%</b> of goal</span>}
                {remaining !== null && remaining > 0 && <span>{money(remaining)} to go</span>}
              </div>
              <div className="vl-live-metrics">
                <span><strong>{donorCount.toLocaleString()}</strong> donors</span>
                <span><strong>{page.ambassadors.length.toLocaleString()}</strong> ambassadors</span>
                {time && time !== "Ended" && <span><strong>{time.replace(" left", "")}</strong> left</span>}
              </div>
              <a className="vl-people-link" href="#supporters">See the people supporting this campaign <span aria-hidden="true">↓</span></a>
            </div>
            <div className="vl-donate-rail">
              {live ? <GiveCard slug={c.slug} presets={c.preset_amounts} matchMultiplier={c.match_multiplier} matchingAvailable={matching} daf={!!process.env.NEXT_PUBLIC_CHARIOT_CID} title="Make your donation" oneTimeOnly/> : (
                <div className="lc-give lc-closed"><div className="lc-give-body"><h2>{draft ? "Campaign preview" : "This campaign has ended"}</h2><p>{draft ? "Publish the campaign to start accepting gifts." : "Thank you for supporting the Lighthouse."}</p>{draft && <Link className="lc-cta" href={`/admin/campaigns/${c.id}`}>Open in admin</Link>}</div></div>
              )}
            </div>
          </div>
        </section>
        <section className="vl-features" aria-label="Event highlights">
          <div><span>01</span><strong>THE TOURNAMENT</strong><small>A competitive night of volleyball</small></div>
          <div><span>02</span><strong>THE GRILLFATHER</strong><small>BBQ and good food</small></div>
          <div><span>03</span><strong>LIVE BAND</strong><small>Music throughout the night</small></div>
        </section>
        <section className="vl-supporters lc-wrap" id="supporters">
          <div className="vl-section-head"><div><span>OUR FUNDRAISING COMMUNITY</span><h2>The people behind it.</h2></div><a href="#donate">Make a donation →</a></div>
          <Supporters page={page} canJoin={live || draft}/>
        </section>
        {stories.length > 0 && <section className="vl-about lc-wrap" id="about"><span>WHAT YOU'RE SUPPORTING</span><h2>About the Lighthouse</h2>{stories.map((s,i)=><p key={i}>{s}</p>)}</section>}
        {(live || draft) && <section className="vl-ambassador" id="join"><div className="vl-ambassador-inner"><div className="vl-amb-kicker">GET IN THE GAME</div><h2>Bring your friends.<br/>Build your team.</h2><p>Start your own fundraising page and help make Volleyball 2027 a success.</p><Link href={`/${c.slug}/join`} className="vl-amb-button">BECOME AN AMBASSADOR <span aria-hidden="true">↗</span></Link></div></section>}
        <section className="vl-share lc-wrap"><ShareBox url={`${SITE_URL}/${c.slug}`} message={`Support The Monsey Lighthouse Volleyball 2027 campaign.`}/></section>
      </main>
    </div>
  );
}
