import Link from "next/link";
import { money, paragraphs, timeAgo, timeLeft, SITE_URL, ORG_NAME } from "@/lib/format";
import GiveCard from "@/components/GiveCard";
import ShareBox from "@/components/ShareBox";
import { DonorWall, FundraiserBoard } from "@/components/Community";
import type { CampaignPage } from "@/lib/data";

/** Event details for campaigns that are an evening out, not just an appeal. */
const EVENT: Record<string, { kicker: string; line: string; items: [string, string][] }> = {
  volley2027: {
    kicker: "Men's night & BBQ",
    line: "A night out with the guys. A tournament worth playing. All in support of The Lighthouse.",
    items: [["Volleyball", "Men's tournament"], ["BBQ", "By The Grillfather"], ["Live band", "All night long"]],
  },
};

export default function CampaignLanding({ page }: { page: CampaignPage }) {
  const { campaign: c, total, donorCount, donations } = page;
  const live = c.status === "live";
  const draft = c.status === "draft";
  const ev = EVENT[c.slug.toLowerCase()];
  const matching = c.match_multiplier > 1 && (c.match_cap == null || page.matched < c.match_cap);
  const pct = c.goal && c.goal > 0 ? (total / c.goal) * 100 : null;
  const left = live ? timeLeft(c.ends_at) : null;
  const story = paragraphs(c.story);
  const tagline = c.tagline || ev?.line || null;
  const recent = donations.slice(0, 14);
  const daf = !!process.env.NEXT_PUBLIC_CHARIOT_CID;

  return (
    <div className="lc">
      {draft && <div className="draft-bar"><div className="wrap">Draft preview: only staff can see this page. Visitors see it once you click <b>Go live</b>. <Link href={`/admin/campaigns/${c.id}`}>Open in admin →</Link></div></div>}
      {live && matching && (
        <div className="lc-matchbar"><span className="lc-x">{c.match_multiplier}×</span> Matching is live: every gift is multiplied {c.match_multiplier} times{c.match_note ? ` · ${c.match_note}` : ""}</div>
      )}

      <section className={"lc-hero" + (c.cover_url ? " has-cover" : "")}>
        {c.cover_url && <img className="lc-hero-bg" src={c.cover_url} alt="" />}
        <div className="lc-beam" aria-hidden="true" />
        <div className="lc-wrap lc-hero-grid">
          <div className="lc-hero-copy">
            <div className="lc-eyebrow">
              {live ? <><span className="lc-pulse" />Live now</> : draft ? "Draft" : "Campaign complete"}
              <span className="lc-sep" />{ev ? ev.kicker : ORG_NAME}
            </div>
            <h1>{c.name}</h1>
            {tagline && <p className="lc-tagline">{tagline}</p>}
            <div className="lc-tally">
              <div className="lc-raised num">{money(total)}</div>
              <div className="lc-of">{c.goal ? <>raised of <b className="num">{money(c.goal)}</b> goal</> : "raised so far"}{live && donorCount === 0 && <> · <span className="lc-first">be the very first donor</span></>}</div>
              {pct !== null && (
                <div className="lc-track" role="progressbar" aria-label="Progress toward goal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
                  <i style={{ width: `${Math.min(100, Math.max(pct, 1.5)).toFixed(1)}%` }} />
                </div>
              )}
              <dl className="lc-stats">
                {pct !== null && pct >= 1 && <div><dt>Of goal</dt><dd className="num">{Math.round(pct)}%</dd></div>}
                {donorCount > 0 && <div><dt>Donors</dt><dd className="num">{donorCount.toLocaleString()}</dd></div>}
                {page.ambassadors.length > 0 && <div><dt>Ambassadors</dt><dd className="num">{page.ambassadors.length}</dd></div>}
                {left && left !== "Ended" && <div><dt>Time left</dt><dd className="num">{left.replace(" left", "")}</dd></div>}
              </dl>
            </div>

            {ev && (
              <ul className="lc-event">
                {ev.items.map(([a, b]) => <li key={a}><b>{a}</b><span>{b}</span></li>)}
              </ul>
            )}

            {(live || draft) && (
              <div className="lc-hero-links">
                <Link href={`/${c.slug}/join`}>Raise money as an ambassador <span aria-hidden="true">→</span></Link>
                <a href="#share">Share this campaign</a>
              </div>
            )}
          </div>

          <div className="lc-hero-side">
            {live ? (
              <GiveCard slug={c.slug} presets={c.preset_amounts} matchMultiplier={c.match_multiplier} matchingAvailable={matching} daf={daf} />
            ) : (
              <section className="lc-give lc-closed">
                <div className="lc-give-body">
                  <h2>{draft ? "Donations open when you go live" : "Thank you to everyone who gave"}</h2>
                  <p>{draft ? "This box becomes the donation form as soon as the campaign is live." : `${c.name} has closed. ${donorCount.toLocaleString()} donors raised ${money(total)}.`}</p>
                  {draft ? <Link className="lc-cta" href={`/admin/campaigns/${c.id}`}>Open in admin</Link> : <Link className="lc-cta" href="/">See current campaigns</Link>}
                </div>
              </section>
            )}
          </div>
        </div>
      </section>

      {recent.length > 0 && (
        <div className="lc-ticker" aria-label="Recent gifts">
          <div className="lc-ticker-track">
            {[0, 1].map((k) => (
              <div className="lc-ticker-set" key={k} aria-hidden={k === 1}>
                {recent.map((d) => (
                  <span key={d.id}><b>{d.display_name}</b> gave <b className="num">{money(d.amount * page.factor)}</b><em>{timeAgo(d.created_at)}</em></span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <main className="lc-main">
        <section className="lc-wrap lc-section" id="fundraisers">
          <header className="lc-head">
            <div>
              <span className="lc-kicker">Leaderboard</span>
              <h2>Our ambassadors &amp; teams</h2>
            </div>
            {(live || draft) && <Link className="lc-btn ghost" href={`/${c.slug}/join`}>Become an ambassador</Link>}
          </header>
          <FundraiserBoard page={page} canJoin={live || draft} />
        </section>

        <section className="lc-wrap lc-section lc-split">
          <div>
            <header className="lc-head"><div><span className="lc-kicker">Donor wall</span><h2>Every gift counts</h2></div></header>
            <DonorWall page={page} />
          </div>
          <aside className="lc-aside">
            {(story.length > 0 || ev) && (
              <div className="lc-story">
                <span className="lc-kicker">Why it matters</span>
                <h2>{ev ? "More than a tournament" : "About this campaign"}</h2>
                {story.length ? story.map((p, i) => <p key={i}>{p}</p>) : <p>Every dollar raised goes to {ORG_NAME} and its work with young women ages 15–25 in our community.</p>}
              </div>
            )}
            <div id="share" className="lc-share">
              <ShareBox url={`${SITE_URL}/${c.slug}`} message={`I'm supporting ${c.name}. Join me:`} />
            </div>
          </aside>
        </section>

        {live && (
          <section className="lc-final">
            <div className="lc-beam" aria-hidden="true" />
            <div className="lc-wrap lc-final-in">
              <h2>Bring more light.</h2>
              <p>{c.goal && total < c.goal ? <><b className="num">{money(c.goal - total)}</b> left to reach the goal. Your gift gets us there.</> : "Every gift makes a difference."}</p>
              <div className="lc-final-acts">
                <a className="lc-cta" href="#donate">Donate now</a>
                <Link className="lc-btn light" href={`/${c.slug}/join`}>Start my own page</Link>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
