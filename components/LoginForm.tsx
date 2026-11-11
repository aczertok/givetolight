"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [err, setErr] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr("Enter a valid email.");
    setErr("");
    setState("sending");
    // "implicit" so the emailed link carries the session itself and works in any browser
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", { auth: { flowType: "implicit", persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${location.origin}/auth/finish?next=${encodeURIComponent(next)}` },
    });
    if (error) { setErr(error.message); setState("idle"); return; }
    setState("sent");
  }
  if (state === "sent") {
    return <div className="panel"><h2>Check your email</h2><p>We sent a sign-in link to <b>{email}</b>. Click the link in it to log in (it works on any phone or computer). It can take a minute; check Spam too.</p></div>;
  }
  return (
    <form className="panel" onSubmit={submit}>
      <label className="f">Email<input className="in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
      {err && <p className="error" role="alert">{err}</p>}
      <button className="btn" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Email me a sign-in link"}</button>
    </form>
  );
}
