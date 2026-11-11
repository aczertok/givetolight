"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

// Sign-in links land here with the session in the address (#access_token=…).
// This works no matter which browser or device the email is opened in.
export default function Finish() {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const q = new URLSearchParams(window.location.search);
    const nextParam = q.get("next") || "/ambassador";
    const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/ambassador";
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (!access_token || !refresh_token) { setFailed(true); return; }
    supabaseBrowser().auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) setFailed(true);
      else window.location.replace(next);
    });
  }, []);
  return (
    <main className="page wrap" style={{ maxWidth: 560 }}>
      <div className="panel">
        {failed ? (
          <p>That sign-in link didn&apos;t work or has expired. <a href="/login">Request a new one</a>.</p>
        ) : (
          <p>Signing you in…</p>
        )}
      </div>
    </main>
  );
}
