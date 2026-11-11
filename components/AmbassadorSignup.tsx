"use client";
import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { registerAmbassador } from "@/app/ambassador/actions";

type Camp = { id: string; slug: string; name: string; status: string };
type Team = { campaign_id: string; slug: string; name: string };

export default function AmbassadorSignup({ campaigns, teams, initial, loggedIn, email: knownEmail }: { campaigns: Camp[]; teams: Team[]; initial?: string; loggedIn: boolean; email?: string }) {
  const [campaign, setCampaign] = useState(initial && campaigns.some((c) => c.slug === initial) ? initial : campaigns[0]?.slug || "");
  const [f, setF] = useState({ name: "", email: "", password: "", phone: "", goal: "", story: "", team: "", newTeam: "" });
  const [teamMode, setTeamMode] = useState<"none" | "join" | "new">("none");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [needLogin, setNeedLogin] = useState(false);
  const camp = campaigns.find((c) => c.slug === campaign);
  const myTeams = teams.filter((t) => t.campaign_id === camp?.id);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setNeedLogin(false);
    if (!f.name.trim()) return setErr("Enter your name.");
    if (!loggedIn && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return setErr("Enter a valid email.");
    if (!loggedIn && f.password.length < 8) return setErr("Choose a password with at least 8 characters.");
    if (teamMode === "new" && !f.newTeam.trim()) return setErr("Enter a name for your new team.");
    setBusy(true);
    const r = await registerAmbassador({ campaign, name: f.name, email: f.email, password: f.password, phone: f.phone, goal: f.goal, story: f.story, team: teamMode === "join" ? f.team : "", newTeam: teamMode === "new" ? f.newTeam : "" });
    if (!r.ok) { setBusy(false); setErr(r.error || "Something went wrong."); setNeedLogin(!!r.login); return; }
    if (r.login) {
      const { error } = await supabaseBrowser().auth.signInWithPassword({ email: f.email.trim().toLowerCase(), password: f.password });
      if (error) { window.location.assign("/login?next=/ambassador"); return; }
    }
    window.location.assign("/ambassador?joined=1");
  }

  if (!campaigns.length) return <div className="panel"><h2>No campaign is open for ambassadors right now</h2><p>Check back soon. The next campaign will open here.</p></div>;
  return (
    <form className="panel as-form" onSubmit={submit} noValidate>
      <h2>{loggedIn ? "Create your ambassador page" : "Sign up as an ambassador"}</h2>
      {campaigns.length > 1 ? (
        <label className="f">Campaign<select className="in" value={campaign} onChange={(e) => { setCampaign(e.target.value); setF((x) => ({ ...x, team: "" })); }}>{campaigns.map((c) => <option key={c.id} value={c.slug}>{c.name}{c.status === "draft" ? " (draft: staff preview)" : ""}</option>)}</select></label>
      ) : <p className="as-camp">Campaign: <b>{camp?.name}</b>{camp?.status === "draft" ? " (draft: staff preview)" : ""}</p>}
      <label className="f">Your name (donors will see it)<input className="in" value={f.name} onChange={set("name")} maxLength={80} placeholder="e.g. Rivka Stein or The Cohen Family" autoComplete="name" /></label>
      {!loggedIn ? (
        <div className="form-grid">
          <label className="f">Email<input className="in" type="email" value={f.email} onChange={set("email")} autoComplete="email" /></label>
          <label className="f">Choose a password<input className="in" type="password" value={f.password} onChange={set("password")} autoComplete="new-password" placeholder="8+ characters" /></label>
        </div>
      ) : <p className="meta" style={{ margin: 0 }}>Signed in as {knownEmail}.</p>}
      <div className="form-grid">
        <label className="f">Phone (private, for updates)<input className="in" type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" /></label>
        <label className="f">Personal goal ($)<input className="in num" inputMode="numeric" value={f.goal} onChange={set("goal")} placeholder="1800" /></label>
      </div>
      <fieldset className="as-team">
        <legend>Team or group</legend>
        <div className="seg" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          <button type="button" className="opt" aria-pressed={teamMode === "none"} onClick={() => setTeamMode("none")}>No team</button>
          <button type="button" className="opt" aria-pressed={teamMode === "join"} onClick={() => setTeamMode("join")} disabled={!myTeams.length} title={myTeams.length ? "" : "No teams yet: start one"}>Join a team</button>
          <button type="button" className="opt" aria-pressed={teamMode === "new"} onClick={() => setTeamMode("new")}>Start a new team</button>
        </div>
        {teamMode === "join" && <select className="in" value={f.team} onChange={set("team")} aria-label="Team"><option value="">Choose your team…</option>{myTeams.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}</select>}
        {teamMode === "new" && <input className="in" value={f.newTeam} onChange={set("newTeam")} maxLength={80} placeholder="Team name, e.g. The Boys or Pomona East" aria-label="New team name" />}
      </fieldset>
      <label className="f">Why I&apos;m raising (optional)<textarea className="in" rows={3} value={f.story} onChange={set("story")} maxLength={1200} /></label>
      {err && <p className="error" role="alert">{err}{needLogin && <> <Link href={`/login?next=${encodeURIComponent(`/ambassador?join=${campaign}`)}`}>Log in</Link></>}</p>}
      <button className="btn" disabled={busy}>{busy ? "Creating your page…" : "Create my ambassador page"}</button>
      {!loggedIn && <p className="meta" style={{ margin: 0 }}>Already an ambassador? <Link href={`/login?next=${encodeURIComponent("/ambassador")}`}>Log in</Link></p>}
    </form>
  );
}
