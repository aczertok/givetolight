"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function SetPassword({ reset, next }: { reset: boolean; next: string }) {
  const [pw, setPw] = useState(""), [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false), [err, setErr] = useState(""), [done, setDone] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setErr("At least 8 characters.");
    if (pw !== pw2) return setErr("The two passwords don't match.");
    setErr(""); setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    setDone(true);
    if (next) setTimeout(() => window.location.assign(next), 900);
  }
  if (done) return <div className="panel"><h2>Password saved</h2><p>From now on you can log in with your email and this password.{next ? " Taking you back…" : ""}</p></div>;
  return (
    <form className="panel" onSubmit={save}>
      <h2>{reset ? "Choose a new password" : "Set or change your password"}</h2>
      <label className="f">New password<input className="in" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label>
      <label className="f">Type it again<input className="in" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></label>
      {err && <p className="error" role="alert">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
    </form>
  );
}
