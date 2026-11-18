import Link from "next/link";
import GiveCard from "@/components/GiveCard";
import Supporters from "@/components/Community";
import ShareBox from "@/components/ShareBox";
import VolleyballArtwork from "@/components/VolleyballArtwork";
import { money, paragraphs, SITE_URL, timeLeft } from "@/lib/format";
import type { CampaignPage } from "@/lib/data";

/** The donation-first event layout. All fundraising numbers and links come from the campaign. */
export default function VolleyballLanding({ page }: { page: CampaignPage }) {
  const { campaign: c, total, donorCount } = page;
  const live = c.status === "live";
  const draft = c.status === "draft";
  const matching = c.match_multiplier > 1 && (c.match_cap == null || page.matched < c.match_cap);
  const pct = c.goal && c.goal > 0 ? Math.round((total / c.goal) * 100) : null;
  const remaining = c.goal && c.goal > 0 ? Math.max(0, c.goal - total) : null;
  const story = paragraphs(c.story);
  const time = live ? timeLeft(c.ends_at) : null;

  return (
    <div className="lc vf vf3">
      {draft && <div className="draft-bar"><div className="wrap">Draft preview — only staff can see this campaign. <Link href={"/admin/campaigns/" + c.id}>Open in admin →</Link></div></div>}
      {live && matching && (
        <div className="vf3-match">
          <span aria-hidden="true">✦</span>
          <strong>{c.match_multiplier}× MATCHING OPPORTUNITY</strong>
          <span>{c.match_note || "Eligible gifts may be multiplied while matching funds remain."}</span>
        </div>
      )}
      <main>
        <div className="vf3-stage">
          <div className="vf3-stage-inner">
            <section className="vf3-event" aria-labelledby="vf3-title">
              <div className="vf3-eyebrow"><span className="vf3-rule" /> THE MONSEY LIGHTHOUSE <span className="vf3-rule" /></div>
              <h1 id="vf3-title">Volleyball <span>2027</span></h1>
              <div className="vf3-subtitle">Men’s Night &amp; BBQ</div>
              <p className="vf3-description">{c.tagline || "A night of volleyball, great food and live music — all in support of The Monsey Lighthouse."}</p>
              <div className="vf3-event-visual"><VolleyballArtwork /></div>
            </section>

            <aside className="vf3-donation-card" aria-label="Campaign progress and donation options">
              <p className="vf3-card-eyebrow">TOGETHER WE MAKE A DIFFERENCE</p>
              <h2 className="vf3-card-title">Support the Lighthouse</h2>
              <div className="vf3-progress-numbers">
                <div><strong className="num">{money(total)}</strong><span>RAISED</span></div>
                {c.goal && c.goal > 0 && <div><strong className="num">{money(c.goal)}</strong><span>GOAL</span></div>}
              </div>
              {pct !== null && (
                <div className="vf3-progress-track" role="progressbar" aria-label="Progress toward campaign goal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, pct))}>
                  <div style={{ width: Math.min(100, Math.max(0, pct)) + "%" }} />
                </div>
              )}
              <div className="vf3-progress-details">
                <span>{pct !== null ? pct + "% of goal" : "Every contribution makes a difference"}</span>
                {remaining !== null && <span>{remaining > 0 ? money(remaining) + " to go" : "Goal reached!"}</span>}
              </div>
              <div className="vf3-social-proof">
                <span><b className="num">{donorCount.toLocaleString()}</b> supporters</span>
                <span><b className="num">{page.ambassadors.length.toLocaleString()}</b> ambassadors</span>
                {time && time !== "Ended" && <span><b>{time.replace(" left", "")}</b> left</span>}
              </div>
              <div className="vf3-card-divider" />
              {live ? (
                <GiveCard slug={c.slug} presets={c.preset_amounts} matchMultiplier={c.match_multiplier} matchingAvailable={matching} daf={!!process.env.NEXT_PUBLIC_CHARIOT_CID} title="Choose your gift" oneTimeOnly />
              ) : (
                <div className="vf3-closed">
                  <h3>{draft ? "Donations open when this campaign goes live" : "This campaign has ended"}</h3>
                  <p>{draft ? "Publish the campaign to start accepting gifts." : "Thank you to everyone who supported the Lighthouse."}</p>
                  {draft && <Link href={"/admin/campaigns/" + c.id} className="lc-cta">Open in admin</Link>}
                </div>
              )}
            </aside>
          </div>
        </div>

        <section className="vf3-lineup" aria-label="Event highlights">
          <div className="vf3-lineup-inner">
            <div><span className="vf3-icon" aria-hidden="true">◉</span><p><strong>VOLLEYBALL</strong><small>Bring your game</small></p></div>
            <div><span className="vf3-icon" aria-hidden="true">♨</span><p><strong>BBQ</strong><small>By The Grillfather</small></p></div>
            <div><span className="vf3-icon" aria-hidden="true">♫</span><p><strong>LIVE MUSIC</strong><small>Enjoy the atmosphere</small></p></div>
          </div>
        </section>

        <section className="vf3-mission lc-wrap" id="about">
          <div className="vf3-mission-brand">
            <img src="/lighthouse-mark.svg" alt="Official Monsey Lighthouse emblem" width="140" height="140" />
            <span>THE MONSEY<br />LIGHTHOUSE</span>
          </div>
          <div className="vf3-mission-content">
            <span className="vf3-section-kicker">MORE THAN A FUNDRAISER</span>
            <h2>Why this matters</h2>
            <p>Your gift helps The Monsey Lighthouse provide support, love and community for girls and young women in a welcoming, nonjudgmental space.</p>
            {story.length > 0 && (
              <div className="vf3-story">
                {story.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            )}
            <Link href="#donate" className="vf3-mission-link">Make a difference today <span aria-hidden="true">↗</span></Link>
          </div>
        </section>

        <section className="vf3-community lc-wrap" id="supporters">
          <div className="vf3-section-heading">
            <div><span className="vf3-section-kicker">THE PEOPLE MAKING IT HAPPEN</span><h2>Every gift moves us forward.</h2></div>
            {live && <a href="#donate">Support this campaign ↗</a>}
          </div>
          <Supporters page={page} canJoin={live || draft} donationFilters />
        </section>

        {(live || draft) && (
          <section className="vf3-ambassadors" id="join">
            <div className="vf3-ambassadors-inner">
              <div><span>HELP YOUR COMMUNITY SHINE</span><h2>Become an ambassador.</h2><p>Invite friends, build a team, and bring even more support to the Lighthouse.</p></div>
              <Link href={"/" + c.slug + "/join"} className="vf3-ambassadors-button">Join as an ambassador <span aria-hidden="true">↗</span></Link>
            </div>
          </section>
        )}
        <section className="vf3-share lc-wrap"><ShareBox url={SITE_URL + "/" + c.slug} message={"Support The Monsey Lighthouse Volleyball 2027 fundraiser."} /></section>
      </main>
    </div>
  );
}
