import Link from "next/link";
import { listCampaigns } from "@/lib/data";
import { money } from "@/lib/format";
import { Progress } from "@/components/Bits";
import { supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Campaign = Awaited<ReturnType<typeof listCampaigns>>[number];

export default async function Home() {
  const campaigns = await listCampaigns().catch(() => []);
  const live = campaigns.filter((c) => c.status === "live");
  const past = campaigns.filter((c) => c.status === "ended");
  const featured = live[0];

  return (
    <>
      <section className="gl-home-hero">
        <div className="gl-glow gl-glow-one" aria-hidden="true" />
        <div className="gl-glow gl-glow-two" aria-hidden="true" />
        <div className="wrap gl-home-grid">
          <div className="gl-home-intro">
            <div className="gl-eyebrow"><span className="gl-live-dot" /> WHERE GENEROSITY COMES TO LIFE</div>
            <h1>Make a gift.<br /><em>Make it matter.</em></h1>
            <p>Real campaigns. Real people. A brighter future built one generous act at a time.</p>
            <div className="gl-hero-actions">
              <a href="#campaigns" className="gl-primary-cta">Find a campaign <span aria-hidden="true">↗</span></a>
              <Link className="gl-quiet-link" href="/ambassador">Start fundraising <span aria-hidden="true">→</span></Link>
            </div>
            <div className="gl-hero-foot"><span className="gl-heart">♥</span> Every gift moves a cause forward.</div>
          </div>
          <div className="gl-feature-wrap">
            {featured ? (
              <Link className="gl-feature-card" href={`/${featured.slug}`}>
                <div className={"gl-feature-media" + (!featured.cover_url ? " gl-feature-placeholder" : "")}>
                  {featured.cover_url ? <img src={featured.cover_url} alt="" /> : <div className="gl-placeholder-symbol" aria-hidden="true">✦</div>}
                  <span className="gl-feature-status"><span className="gl-live-dot" /> LIVE CAMPAIGN</span>
                </div>
                <div className="gl-feature-body">
                  <span className="gl-small-label">FEATURED FUNDRAISER</span>
                  <h2>{featured.name}</h2>
                  {featured.tagline && <p>{featured.tagline}</p>}
                  <div className="gl-progress-totals"><strong>{money(featured.total)}</strong><span>{featured.goal ? `of ${money(featured.goal)} goal` : `${featured.donors} donors`}</span></div>
                  <Progress value={featured.total} goal={featured.goal} />
                  <div className="gl-feature-bottom"><span>{featured.donors} people have given</span><b>Support this cause <span aria-hidden="true">↗</span></b></div>
                </div>
              </Link>
            ) : (
              <div className="gl-feature-card gl-coming-soon">
                <div className="gl-coming-art" aria-hidden="true"><div className="gl-coming-sun">✦</div></div>
                <div className="gl-feature-body">
                  <span className="gl-small-label">YOUR IMPACT STARTS HERE</span>
                  <h2>Something meaningful is on its way.</h2>
                  <p>Our next fundraising campaign will appear here soon.</p>
                  <Link href="/ambassador" className="gl-feature-text-link">Get involved <span aria-hidden="true">↗</span></Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="gl-main wrap" id="campaigns">
        {!supabaseConfigured() && <p className="note-box">Campaigns will appear as soon as the database setup is complete.</p>}
        <div className="gl-section-top">
          <div>
            <div className="gl-overline">FIND A CAUSE TO LOVE</div>
            <h2>Campaigns making <em>an impact.</em></h2>
          </div>
          {live.length > 0 && <div className="gl-live-count"><span className="gl-live-dot" /> {live.length} {live.length === 1 ? "campaign" : "campaigns"} live</div>}
        </div>
        {live.length ? (
          <div className="gl-campaign-grid">{live.map((c) => <CampaignCard key={c.id} c={c} />)}</div>
        ) : (
          <div className="gl-empty-campaigns">
            <span className="gl-empty-spark" aria-hidden="true">✧</span>
            <h3>New campaigns are coming.</h3>
            <p>Check back soon to support a cause that speaks to you.</p>
          </div>
        )}
        {past.length > 0 && (
          <section className="gl-past-campaigns">
            <div className="gl-section-top"><div><div className="gl-overline">GOOD THINGS HAPPENED HERE</div><h2>Past campaigns.</h2></div></div>
            <div className="gl-campaign-grid">{past.map((c) => <CampaignCard key={c.id} c={c} />)}</div>
          </section>
        )}
        <div className="gl-bottom-banner">
          <div><span className="gl-overline">BE PART OF SOMETHING BIGGER</span><h2>Your people. Your page. Your impact.</h2><p>Join a campaign as an ambassador and share your own fundraising link.</p></div>
          <Link href="/ambassador" className="gl-banner-cta">Become an ambassador <span aria-hidden="true">↗</span></Link>
        </div>
      </main>
    </>
  );
}

function CampaignCard({ c }: { c: Campaign }) {
  return (
    <Link href={`/${c.slug}`} className="gl-campaign-card">
      <div className="gl-campaign-image">
        {c.cover_url ? <img src={c.cover_url} alt="" /> : <span aria-hidden="true" className="gl-campaign-placeholder">✦</span>}
        <span className="gl-card-status">{c.status === "live" ? "● LIVE NOW" : "CAMPAIGN ENDED"}</span>
      </div>
      <div className="gl-campaign-content">
        <h3>{c.name}</h3>
        {c.tagline && <p>{c.tagline}</p>}
        <div className="gl-card-numbers"><strong>{money(c.total)}</strong><span>{c.goal ? `of ${money(c.goal)}` : `${c.donors} donors`}</span></div>
        <Progress value={c.total} goal={c.goal} small />
        <div className="gl-card-bottom"><span>{c.donors} supporters</span><b>{c.status === "live" ? "Donate now" : "View campaign"} <span aria-hidden="true">↗</span></b></div>
      </div>
    </Link>
  );
}
