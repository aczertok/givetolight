import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { money } from "@/lib/format";
import CampaignFields from "@/components/CampaignFields";
import { updateCampaign, addTeam, updateTeam, adminAddAmbassador } from "../../actions";

const ERR: Record<string, string> = { reserved: "That web address is reserved. Choose another.", taken: "Another campaign already uses that web address.", save: "Couldn't save. Please try again." };

export default async function EditCampaign({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; created?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { sb, user } = await requireAdmin();
  const { data: c } = await sb.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();
  const { data: teams } = await sb.from("teams").select("*").eq("campaign_id", id).order("name");
  const { data: ambs } = await sb.from("ambassadors").select("id, name, slug, status, team_id").eq("campaign_id", id).order("name");
  return (
    <>
      <div className="toolbar">
        <h1 className="section-h" style={{ margin: 0 }}>{c.name}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn ghost" href={`/admin/donations?c=${c.id}`}>Donations</Link>
          <Link className="btn ghost" href={`/admin/ambassadors?c=${c.id}`}>Ambassadors ({ambs?.length || 0})</Link>
          {c.status !== "draft" && <Link className="btn ghost" href={`/${c.slug}`}>View page</Link>}
        </div>
      </div>
      {sp.created && <p className="note-box">Campaign created as {c.status}. Set it to Live when you&apos;re ready for donations.</p>}
      {sp.saved && <p className="note-box">Saved.</p>}
      {sp.error && <p className="error">{ERR[sp.error] || ERR.save}</p>}
      <form className="panel" action={updateCampaign}>
        <input type="hidden" name="id" value={c.id} />
        <CampaignFields c={c} userId={user.id} />
        <button className="btn" style={{ justifySelf: "start" }}>Save campaign</button>
      </form>

      <h2 className="section-h">Teams</h2>
      <div className="tw"><table><thead><tr><th>Team</th><th>Goal ($)</th><th>Description</th><th></th></tr></thead><tbody>
        {(teams || []).map((t) => (
          <tr key={t.id}>
            <td colSpan={4} style={{ padding: 0 }}>
              <form action={updateTeam} style={{ display: "grid", gridTemplateColumns: "1.2fr .6fr 2fr auto", gap: 8, padding: "8px 12px", alignItems: "center" }}>
                <input type="hidden" name="id" value={t.id} /><input type="hidden" name="campaign_id" value={c.id} />
                <input className="in" name="name" defaultValue={t.name} aria-label="Team name" />
                <input className="in num" name="goal" type="number" defaultValue={t.goal ?? ""} aria-label="Team goal" />
                <input className="in" name="blurb" defaultValue={t.blurb ?? ""} aria-label="Team description" />
                <span style={{ display: "flex", gap: 6 }}>
                  <button className="btn ghost sm">Save</button>
                  <button className="btn ghost sm" name="delete" value="1" title="Gifts stay; they just lose the team label">Delete</button>
                </span>
              </form>
            </td>
          </tr>
        ))}
        <tr><td colSpan={4} style={{ padding: 0 }}>
          <form action={addTeam} style={{ display: "grid", gridTemplateColumns: "1.2fr .6fr 2fr auto", gap: 8, padding: "8px 12px" }}>
            <input type="hidden" name="campaign_id" value={c.id} />
            <input className="in" name="name" placeholder="New team name" aria-label="New team name" />
            <input className="in num" name="goal" type="number" placeholder="Goal" aria-label="New team goal" />
            <input className="in" name="blurb" placeholder="Short description" aria-label="New team description" />
            <button className="btn sm">Add team</button>
          </form>
        </td></tr>
      </tbody></table></div>

      <h2 className="section-h">Add an ambassador yourself</h2>
      <form className="panel" action={adminAddAmbassador} style={{ maxWidth: 860 }}>
        <p>For someone who won&apos;t sign up themselves. Their page goes live right away; they can claim it later by logging in with the same email.</p>
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
      <p className="meta" style={{ marginTop: 10 }}>{(ambs || []).filter((a) => a.status === "live").length} live · {(ambs || []).filter((a) => a.status === "pending").length} waiting · goal {c.goal ? money(c.goal) : "not set"}</p>
    </>
  );
}
