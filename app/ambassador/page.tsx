import Link from "next/link";
import { currentUser, supabaseServer } from "@/lib/supabase/server";
import { listCampaigns, matchMath } from "@/lib/data";
import { money, SITE_URL, timeAgo } from "@/lib/format";
import { Progress } from "@/components/Bits";
import ShareBox from "@/components/ShareBox";
import PhotoField from "@/components/PhotoField";
import { joinCampaign, updateMyPage } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ambassadors" };

type Mine = { id: string; campaign_id: string; team_id: string | null; slug: string; name: string; goal: number | null; story: string | null; photo_url: string | null; phone: string | null; status: string };

export default async function AmbassadorHome({ searchParams }: { searchParams: Promise<{ join?: string; error?: string; joined?: string; saved?: string }> }) {
  const sp = await searchParams;
  const user = await currentUser();
  const campaigns = await listCampaigns().catch(() => []);
  const live = campaigns.filter((c) => c.status === "live");

  if (!user) {
    return (
      <main className="page wrap" style={{ maxWidth: 720 }}>
        <h1 className="section-h">Become an ambassador</h1>
        <div className="panel">
          <p style={{ color: "var(--ink)", fontSize: 16 }}>Ambassadors get their own page with a goal, a progress bar and a link to share with family and friends. Every gift to your page counts toward the campaign{live.some((c) => c.match_multiplier > 1) ? " and is matched" : ""}.</p>
          <p>Log in with your email to create your page, or to see the page you already have.</p>
          <Link className="btn" href={`/login?next=${encodeURIComponent("/ambassador" + (sp.join ? `?join=${sp.join}` : ""))}`} style={{ justifySelf: "start" }}>Log in or sign up</Link>
        </div>
      </main>
    );
  }

  const sb = await supabaseServer();
  const { data: mineRaw } = await sb.from("ambassadors").select("id, campaign_id, team_id, slug, name, goal, story, photo_url, phone, status").eq("user_id", user.id).order("created_at", { ascending: false });
  const mine = (mineRaw || []) as Mine[];
  const ids = mine.map((m) => m.id);
  const { data: gifts } = ids.length
    ? await sb.from("donations").select("id, ambassador_id, donor_name, anonymous, amount, dedication, message, created_at, status").in("ambassador_id", ids).eq("status", "succeeded").order("created_at", { ascending: false })
    : { data: [] as never[] };
  const campaignById = new Map(campaigns.map((c) => [c.id, c]));
  const joinable = live.filter((c) => !mine.some((m) => m.campaign_id === c.id));
  const joinSlug = sp.join && joinable.some((c) => c.slug === sp.join) ? sp.join : joinable[0]?.slug;
  const { data: teams } = joinable.length ? await sb.from("teams_public").select("campaign_id, slug, name").in("campaign_id", joinable.map((c) => c.id)) : { data: [] };

  return (
    <main className="page wrap">
      <div className="toolbar">
        <h1 className="section-h" style={{ margin: 0 }}>My ambassador pages</h1>
        <form action="/auth/logout" method="post"><span className="meta" style={{ marginRight: 10 }}>{user.email}</span><button className="btn ghost sm">Log out</button></form>
      </div>
      {sp.joined && <p className="note-box">Your page is created.{mine[0]?.status === "pending" ? " Staff will approve it shortly, and you'll be able to share it then." : ""}</p>}
      {sp.saved && <p className="note-box">Saved.</p>}
      {sp.error && <p className="error">{sp.error === "closed" ? "That campaign isn't open for new ambassadors." : sp.error === "name" ? "Enter the name donors will see." : "Something went wrong saving your page. Please try again."}</p>}

      {mine.map((m) => {
        const c = campaignById.get(m.campaign_id);
        const myGifts = (gifts || []).filter((g) => g.ambassador_id === m.id);
        const raisedRaw = myGifts.reduce((s, g) => s + Number(g.amount), 0);
        const factor = c ? matchMath(c, c.raised).factor : 1;
        const raised = raisedRaw * factor;
        const url = `${SITE_URL}/${c?.slug}/${m.slug}`;
        return (
          <section key={m.id} style={{ marginBottom: 36 }}>
            <h2 className="section-h">{c?.name || "Campaign"} <span className={`pill ${m.status === "live" ? "ok" : m.status === "pending" ? "wait" : "off"}`} style={{ verticalAlign: "middle" }}>{m.status === "live" ? "Live" : m.status === "pending" ? "Waiting for approval" : "Hidden"}</span></h2>
            <div className="kpis num">
              <div className="kpi"><span>Raised</span><b>{money(raised)}</b><small>{factor > 1 ? `${money(raisedRaw)} + match` : " "}</small></div>
              <div className="kpi"><span>Goal</span><b>{m.goal ? Math.round((raised / m.goal) * 100) + "%" : "—"}</b><small>{m.goal ? `of ${money(m.goal)}` : "Set a goal below"}</small></div>
              <div className="kpi"><span>Donors</span><b>{myGifts.length}</b><small>{myGifts[0] ? `latest ${timeAgo(myGifts[0].created_at)}` : "none yet"}</small></div>
            </div>
            <Progress value={raised} goal={m.goal} />
            <div className="two" style={{ marginTop: 18 }}>
              <form className="panel" action={updateMyPage}>
                <h2>Edit my page</h2>
                <input type="hidden" name="id" value={m.id} />
                <PhotoField userId={user.id} current={m.photo_url} />
                <label className="f">Name donors see<input className="in" name="name" defaultValue={m.name} required maxLength={80} /></label>
                <div className="form-grid">
                  <label className="f">Personal goal ($)<input className="in num" name="goal" type="number" min="0" step="1" defaultValue={m.goal ?? ""} /></label>
                  <label className="f">Phone (private)<input className="in" name="phone" type="tel" defaultValue={m.phone ?? ""} /></label>
                </div>
                <label className="f">Why I&apos;m raising<textarea className="in" name="story" rows={4} defaultValue={m.story ?? ""} maxLength={1200} /></label>
                <button className="btn" style={{ justifySelf: "start" }}>Save</button>
              </form>
              <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
                {m.status === "live" ? (
                  <>
                    <ShareBox url={url} message={`I'm raising money for The Lighthouse Project's ${c?.name}. Every gift helps the girls${factor > 1 ? ` and is matched ×${c?.match_multiplier}` : ""}. Please support my page:`} />
                    <Link className="btn ghost" href={`/${c?.slug}/${m.slug}`}>View my public page</Link>
                  </>
                ) : <div className="note-box">Your share link appears here once staff approve your page.</div>}
              </div>
            </div>
            <h3 style={{ marginTop: 22 }}>My donors</h3>
            {myGifts.length ? (
              <div className="tw"><table><thead><tr><th>Donor</th><th>When</th><th className="r">Gave</th><th>Note</th></tr></thead><tbody>
                {myGifts.map((g) => <tr key={g.id}><td>{g.donor_name || "Anonymous"}{g.anonymous ? " (shown as Anonymous)" : ""}</td><td>{timeAgo(g.created_at)}</td><td className="r num">{money(g.amount)}</td><td>{[g.dedication, g.message].filter(Boolean).join(" · ") || "—"}</td></tr>)}
              </tbody></table></div>
            ) : <div className="donors"><div className="empty">No gifts yet. Share your link to get your first one.</div></div>}
          </section>
        );
      })}

      {joinable.length > 0 && (
        <form className="panel" action={joinCampaign} style={{ maxWidth: 640, marginTop: mine.length ? 20 : 0 }}>
          <h2>{mine.length ? "Join another campaign" : "Create your ambassador page"}</h2>
          <label className="f">Campaign
            <select className="in" name="campaign" defaultValue={joinSlug}>{joinable.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</select>
          </label>
          {(teams || []).length > 0 && (
            <label className="f">Team (optional)
              <select className="in" name="team" defaultValue="">
                <option value="">No team</option>
                {(teams || []).map((t) => <option key={t.campaign_id + t.slug} value={t.slug}>{t.name} · {campaignById.get(t.campaign_id)?.name}</option>)}
              </select>
            </label>
          )}
          <label className="f">Name donors will see<input className="in" name="name" required maxLength={80} placeholder="e.g. Rivka S. or The Cohen Family" /></label>
          <div className="form-grid">
            <label className="f">Personal goal ($)<input className="in num" name="goal" type="number" min="0" step="1" placeholder="1800" /></label>
            <label className="f">Phone (private)<input className="in" name="phone" type="tel" /></label>
          </div>
          <label className="f">Why I&apos;m raising (optional)<textarea className="in" name="story" rows={3} maxLength={1200} /></label>
          <button className="btn" style={{ justifySelf: "start" }}>Create my page</button>
        </form>
      )}
      {!mine.length && !joinable.length && <div className="donors"><div className="empty">No campaign is open for ambassadors right now.</div></div>}
    </main>
  );
}
