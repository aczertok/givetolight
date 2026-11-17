import Link from "next/link";
import { money, paragraphs, timeLeft, SITE_URL } from "@/lib/format";
import GiveCard from "@/components/GiveCard";
import ShareBox from "@/components/ShareBox";
import Supporters from "@/components/Community";
import EventPoster from "@/components/EventPoster";
import type { CampaignPage } from "@/lib/data";

/** Poster wording for campaigns that are an event. Others use the campaign name. */
const EVENT: Record<string, { kind: "volleyball"; kicker: string; title: string; accent: string; line: string }> = {
  volley2027: {
    kind: "volleyball",
    kicker: "The Monsey Lighthouse presents",
    title: "Volleyball Tournament",
    accent: "2027",
    line: "Men's night · BBQ by The Grillfather · Live band",
  },
};

export default function CampaignLanding({ page }: { page: CampaignPage }) {
  const { campaign: c, total, donorCount } = page;
  const live = c.status === "live";
  const draft = c.status === "draft";
  const ev = EVENT[c.slug.toLowerCase()];
  const matching = c.match_multiplier > 1 && (c.match_cap == null || page.matched < c.match_cap);
  const pct = c.goal && c.goal > 0 ? (total / c.goal) * 100 : null;
  const left = live ? timeLeft(c.ends_at) : null;
  const story = paragraphs(c.story);
  const daf = !!process.env.NEXT_PUBLIC_CHARIOT_CID;

  return (
    <div className="lc">
      {draft && <div className="draft-bar"><div className="wrap">Draft preview: only staff can see this page. Visitors see it once you click <b>Go live</b>. <Link href={`/admin/campaigns/${c.id}`}>Open in admin →</Link></div></div>}
      {live && matching && <div className="lc-matchbar"><span className="lc-x">{c.match_multiplier}×</span> Matching is live: every gift is multiplied {c.match_multiplier} times</div>}

      {ev
        ? <EventPoster kind={ev.kind} kicker={ev.kicker} title={ev.title} accent={ev.accent} line={c.tagline || ev.line} cover={c.cover_url} />
        : <EventPoster kind="default" kicker="The Lighthouse Project" title={c.name} line={c.tagline} cover={c.cover_url} />}

      <section className="lc-wrap lb">
        <div className="lb-tally">
          {ev && <div className="lb-name">{c.name}</div>}
          <div className="lb-raised num">{money(total)}</div>
          <div className="lb-of">
            {c.goal ? <>raised of <b className="num">{money(c.goal)}</b></> : "raised so far"}
            {live && donorCount === 0 && <span className="lb-first"> · be the first to give</span>}
          </div>
          {pct !== null && (
            <div className="lb-track" role="progressbar" aria-label="Progress toward goal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
              <i style={{ width: `${Math.min(100, Math.max(pct, 1.5)).toFixed(1)}%` }} />
            </div>
          )}
          <div className="lb-stats num">
            {pct !== null && pct >= 1 && <span><b>{Math.round(pct)}%</b> of goal</span>}
            {donorCount > 0 && <span><b>{donorCount.toLocaleString()}</b> donors</span>}
            {left && left !== "Ended" && <span><b>{left.replace(" left", "")}</b> left</span>}
          </div>
          {(live || draft) && <Link className="lb-amb" href={`/${c.slug}/join`}>Raise money with your own ambassador page →</Link>}
        </div>
        <div className="lb-card">
          {live ? (
            <GiveCard slug={c.slug} presets={c.preset_amounts} matchMultiplier={c.match_multiplier} matchingAvailable={matching} daf={daf} />
          ) : (
            <section className="lc-give lc-closed">
              <div className="lc-give-body">
                <h2>{draft ? "Donations open when you go live" : "Thank you to everyone who gave"}</h2>
                <p>{draft ? "This box becomes the donation form as soon as the campaign is live." : `This campaign has closed. ${donorCount.toLocaleString()} donors raised ${money(total)}.`}</p>
                {draft ? <Link className="lc-cta" href={`/admin/campaigns/${c.id}`}>Open in admin</Link> : <Link className="lc-cta" href="/">See current campaigns</Link>}
              </div>
            </section>
          )}
        </div>
      </section>

      <section className="lc-wrap lc-section" id="supporters">
        <h2 className="lc-h2">Supporters</h2>
        <Supporters page={page} canJoin={live || draft} />
      </section>

      <section className="lc-wrap lc-section lc-about">
        {story.length > 0 && <div className="lc-story"><h2 className="lc-h2">About</h2>{story.map((p, i) => <p key={i}>{p}</p>)}</div>}
        <div id="share" className="lc-share"><ShareBox url={`${SITE_URL}/${c.slug}`} message={`I'm supporting ${c.name}. Join me:`} /></div>
      </section>
    </div>
  );
}
