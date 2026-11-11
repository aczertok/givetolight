"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function SetPassword({ reset, next, embedded }: { reset: boolean; next: string; embedded?: boolean }) {
  const [pw, setPw] = useState(""), [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false), [err, setErr] = useState(""), [done, setDone] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setErr("At least 8 characters.");
    if (pw !== pw2) return setErr("The two passwords don't match.");
    setErr(""); setBusy(true);
    const sb = supabaseBrowser();
    const { error } = await sb.auth.updateUser({ password: pw, data: { has_password: true } });
    setBusy(false);
    if (error && !/different from the old/i.test(error.message)) return setErr(error.message);
    if (error) await sb.auth.updateUser({ data: { has_password: true } });
    setDone(error ? "That's already your password, so you're all set." : "Password saved. From now on, log in with your email and this password.");
    if (next) setTimeout(() => window.location.assign(next), 1200);
  }
  if (done) return <div className={embedded ? "" : "panel"}><p style={{ margin: 0, color: "var(--ok)", fontWeight: 600 }}>✓ {done}</p>{next && <p className="meta" style={{ margin: "6px 0 0" }}>Taking you to your dashboard…</p>}</div>;
  return (
    <form className={embedded ? "" : "panel"} onSubmit={save} style={embedded ? { display: "grid", gap: 12 } : undefined}>
      {!embedded && <h2>{reset ? "Choose your password" : "Change your password"}</h2>}
      <label className="f">New password<input className="in" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label>
      <label className="f">Type it again<input className="in" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></label>
      {err && <p className="error" role="alert">{err}</p>}
      <button className="btn" disabled={busy} style={{ justifySelf: "start" }}>{busy ? "Saving…" : "Save password"}</button>
    </form>
  );
}
