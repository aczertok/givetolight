"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Mode = "password" | "signup" | "forgot" | "link";
const okEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
// "implicit" so emailed links carry the session and work in any browser or on any phone.
const linkClient = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

export default function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState("");
  const finish = (to: string) => `${location.origin}/auth/finish?next=${encodeURIComponent(to)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!okEmail(em)) return setErr("Enter a valid email.");
    if ((mode === "password" || mode === "signup") && password.length < 8) return setErr("Your password needs at least 8 characters.");
    setErr(""); setBusy(true);
    try {
      if (mode === "password") {
        const { error } = await supabaseBrowser().auth.signInWithPassword({ email: em, password });
        if (error) {
          setErr(/invalid/i.test(error.message) ? "That email and password don't match. If you've only used email links before, click “Forgot password” to set one." : /confirm/i.test(error.message) ? "Please confirm your email first: open the email we sent you and click the link." : error.message);
          return;
        }
        window.location.assign(next);
      } else if (mode === "signup") {
        const { data, error } = await linkClient().auth.signUp({ email: em, password, options: { data: { full_name: name.trim() }, emailRedirectTo: finish(next) } });
        if (error) { setErr(/registered|exists/i.test(error.message) ? "There's already an account with this email. Log in instead, or use “Forgot password”." : error.message); return; }
        if (data.session) {
          await supabaseBrowser().auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
          window.location.assign(next);
        } else if (data.user && !data.user.identities?.length) {
          setErr("There's already an account with this email. Log in instead, or use “Forgot password”.");
        } else setSent(`We sent a confirmation link to ${em}. Click it to finish creating your account.`);
      } else if (mode === "forgot") {
        const { error } = await linkClient().auth.resetPasswordForEmail(em, { redirectTo: finish(`/account?reset=1`) });
        if (error) { setErr(error.message); return; }
        setSent(`If ${em} has an account, we sent a link to set a new password.`);
      } else {
        const { error } = await linkClient().auth.signInWithOtp({ email: em, options: { emailRedirectTo: finish(next) } });
        if (error) { setErr(error.message); return; }
        setSent(`We sent a sign-in link to ${em}. It works on any phone or computer.`);
      }
    } finally { setBusy(false); }
  }

  if (sent) return (
    <div className="panel"><h2>Check your email</h2><p>{sent} It can take a minute; check Spam too.</p>
      <button type="button" className="btn ghost sm" style={{ justifySelf: "start" }} onClick={() => { setSent(""); setMode("password"); }}>Back to log in</button></div>
  );
  const title = { password: "Log in", signup: "Create your account", forgot: "Reset your password", link: "Log in with an email link" }[mode];
  const cta = { password: "Log in", signup: "Create account", forgot: "Email me a reset link", link: "Email me a sign-in link" }[mode];
  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h2>{title}</h2>
      {mode === "signup" && <label className="f">Full name<input className="in" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>}
      <label className="f">Email<input className="in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
      {(mode === "password" || mode === "signup") && (
        <label className="f">
          <span style={{ display: "flex", justifyContent: "space-between" }}>Password{mode === "password" && <button type="button" className="lf-link" onClick={() => { setMode("forgot"); setErr(""); }}>Forgot password?</button>}</span>
          <span style={{ position: "relative", display: "block" }}>
            <input className="in" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} required style={{ width: "100%", paddingRight: 64 }} />
            <button type="button" className="lf-show" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>{show ? "Hide" : "Show"}</button>
          </span>
          {mode === "signup" && <span className="meta" style={{ fontWeight: 400 }}>At least 8 characters.</span>}
        </label>
      )}
      {err && <p className="error" role="alert">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? "One moment…" : cta}</button>
      <div className="lf-alt">
        {mode !== "password" && <button type="button" className="lf-link" onClick={() => { setMode("password"); setErr(""); }}>Log in with a password</button>}
        {mode !== "signup" && <button type="button" className="lf-link" onClick={() => { setMode("signup"); setErr(""); }}>New here? Create an account</button>}
        {mode !== "link" && <button type="button" className="lf-link" onClick={() => { setMode("link"); setErr(""); }}>Email me a sign-in link instead</button>}
      </div>
    </form>
  );
}
