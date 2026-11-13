import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { money, SITE_HOST } from "@/lib/format";
import CampaignFields from "@/components/CampaignFields";
import { updateCampaign, addTeam, updateTeam, adminAddAmbassador, setCampaignStatus, setAmbassadorStatus } from "../../actions";

const ERR: Record<string, string> = { reserved: "That web address is reserved. Choose another.", taken: "Another campaign already uses that web address.", save: "Couldn't save. Please try again." };

export default async function EditCampaign({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; created?: string; error?: string; tab?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const tab = sp.tab === "teams" || sp.tab === "ambassadors" ? sp.tab : "details";
  const { sb, user } = await requireAdmin();
  const { data: c } = await sb.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const { data: teams } = await sb.from("teams").select("*").eq("campaign_id", id).order("name");
  const { data: slugs } = await sb.from("campaigns").select("slug");
  const { data: ambs } = await sb.from("ambassadors").select("id, name, slug, status, team_id, goal, email, phone").eq("campaign_id", id).order("name");
  const members = (tid: string) => (ambs || []).filter((a) => a.team_id === tid).length;
  const url = `${SITE_HOST}/${c.slug}`;
  return (
    <>
      <div className="adm-h">
        <div>
          <h1>{c.name}</h1>
          <p><span className={`pill ${c.status === "live" ? "ok" : c.status === "draft" ? "wait" : "off"}`}>{c.status}</span> · <a href={`/${c.slug}`} target="_blank" rel="noreferrer">{url}</a>{c.status === "draft" && " · only staff can see it"}</p>
        </div>
        <div className="acts">
          {c.status !== "live" && <form action={setCampaignStatus}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="live" /><button className="btn" type="submit">{c.status === "draft" ? "Go live" : "Reopen"}</button></form>}
          <Link className="btn ghost" href={`/admin/campaigns/${c.id}/dashboard`}>Dashboard</Link>
          <a className="btn ghost" href={`/${c.slug}`} target="_blank" rel="noreferrer">{c.status === "draft" ? "Preview page" : "View page"}</a>
        </div>
      </div>
      {sp.created && <p className="note-box" style={{ marginBottom: 14 }}>Your campaign is created as a <b>Draft</b>. Add teams, check the page with <b>Preview page</b>, then click <b>Go live</b>.</p>}
      {sp.saved && <p className="note-box" style={{ marginBottom: 14 }}>Saved.</p>}
      {sp.error && <p className="error" style={{ marginBottom: 14 }}>{ERR[sp.error] || ERR.save}</p>}

      <div className="cc-tabs" role="tablist" style={{ marginBottom: 16 }}>
        <Link role="tab" className="cc-tab" aria-selected={tab === "details"} href={`/admin/campaigns/${c.id}`}>Details</Link>
        <Link role="tab" className="cc-tab" aria-selected={tab === "teams"} href={`/admin/campaigns/${c.id}?tab=teams`}>Teams &amp; groups<span className="num">{teams?.length || 0}</span></Link>
        <Link role="tab" className="cc-tab" aria-selected={tab === "ambassadors"} href={`/admin/campaigns/${c.id}?tab=ambassadors`}>Ambassadors<span className="num">{ambs?.length || 0}</span></Link>
      </div>

      {tab === "details" && (
        <form action={updateCampaign}>
          <input type="hidden" name="id" value={c.id} />
          <CampaignFields c={c} userId={user.id} taken={(slugs || []).map((x) => x.slug)} />
          <div className="cf-save"><button className="btn">Save campaign</button></div>
        </form>
      )}

      {tab === "teams" && (
        <div style={{ display: "grid", gap: 16, maxWidth: 900 }}>
          <form className="panel" action={addTeam}>
            <h2>Add a team or group</h2>
            <p>Teams get their own page at {url}/team/<i>name</i>, with their own goal and leaderboard. Ambassadors can also start a team themselves when they sign up.</p>
            <input type="hidden" name="campaign_id" value={c.id} />
            <div className="form-grid">
              <label className="f">Team name<input className="in" name="name" required placeholder="e.g. The Boys, Pomona East, Camp Merockdim" /></label>
              <label className="f">Team goal ($)<input className="in num" name="goal" type="number" min="0" placeholder="10000" /></label>
              <label className="f full">Short description (optional)<input className="in" name="blurb" maxLength={300} /></label>
            </div>
            <button className="btn" style={{ justifySelf: "start" }}>Add team</button>
          </form>
          {!teams?.length ? <div className="ov-empty"><span>No teams yet. Add your first one above.</span></div> : (
            <div className="tw"><table>
              <thead><tr><th>Team</th><th>Goal ($)</th><th>Description</th><th className="r">Ambassadors</th><th /></tr></thead>
              <tbody>{teams.map((t) => (
                <tr key={t.id}><td colSpan={5} style={{ padding: 0 }}>
                  <form action={updateTeam} className="team-row">
                    <input type="hidden" name="id" value={t.id} /><input type="hidden" name="campaign_id" value={c.id} />
                    <input className="in" name="name" defaultValue={t.name} aria-label="Team name" />
                    <input className="in num" name="goal" type="number" defaultValue={t.goal ?? ""} aria-label="Team goal" placeholder="Goal" />
                    <input className="in" name="blurb" defaultValue={t.blurb ?? ""} aria-label="Team description" placeholder="Description" />
                    <span className="num meta" style={{ textAlign: "right" }}>{members(t.id)}</span>
                    <span className="acts">
                      <button className="btn ghost sm">Save</button>
                      {c.status !== "draft" && <a className="btn ghost sm" href={`/${c.slug}/team/${t.slug}`} target="_blank" rel="noreferrer">Page</a>}
                      <button className="btn ghost sm" name="delete" value="1" title="Gifts stay; they just lose the team label">Delete</button>
                    </span>
                  </form>
                </td></tr>
              ))}</tbody>
            </table></div>
          )}
        </div>
      )}

      {tab === "ambassadors" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="panel">
            <h2>Ambassador sign-up link</h2>
            <p>Send this to anyone you want as an ambassador. They fill in one form and get their own page{c.ambassador_approval ? "; you approve them here" : ""}.</p>
            <div className="slug-box" style={{ maxWidth: 560 }}><span className="slug-host">Sign-up:</span><input className="slug-in" readOnly value={`https://${url}/join`} aria-label="Ambassador sign-up link" /></div>
          </div>
          {!ambs?.length ? <div className="ov-empty"><span>No ambassadors yet.</span></div> : (
            <div className="tw"><table>
              <thead><tr><th>Ambassador</th><th>Team</th><th>Email</th><th>Phone</th><th className="r">Goal</th><th>Status</th><th /></tr></thead>
              <tbody>{ambs.map((a) => (
                <tr key={a.id}>
                  <td><b>{a.name}</b></td><td className="meta">{(teams || []).find((t) => t.id === a.team_id)?.name || "—"}</td>
                  <td className="meta">{a.email || "—"}</td><td className="meta">{a.phone || "—"}</td><td className="r num">{a.goal ? money(a.goal) : "—"}</td>
                  <td><span className={`pill ${a.status === "live" ? "ok" : a.status === "pending" ? "wait" : "off"}`}>{a.status === "pending" ? "waiting" : a.status}</span></td>
                  <td><form action={setAmbassadorStatus} className="acts"><input type="hidden" name="id" value={a.id} />
                    {a.status !== "live" && <button className="btn sm" name="status" value="live">{a.status === "pending" ? "Approve" : "Show"}</button>}
                    {a.status !== "hidden" && <button className="btn ghost sm" name="status" value="hidden">Hide</button>}
                  </form></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
          <form className="panel" action={adminAddAmbassador} style={{ maxWidth: 860 }}>
            <h2>Add an ambassador yourself</h2>
            <p>For someone who won&apos;t sign up themselves. Their page goes live right away.</p>
            <input type="hidden" name="campaign_id" value={c.id} />
            <div className="form-grid">
              <label className="f">Name<input className="in" name="name" required /></label>
              <label className="f">Team<select className="in" name="team_id" defaultValue=""><option value="">No team</option>{(teams || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
              <label className="f">Goal ($)<input className="in num" name="goal" type="number" /></label>
              <label className="f">Phone<input className="in" name="phone" type="tel" /></label>
              <label className="f full">Email<input className="in" name="email" type="email" /></label>
            </div>
            <button className="btn" style={{ justifySelf: "start" }}>Add ambassador</button>
          </form>
        </div>
      )}
    </>
  );
}
