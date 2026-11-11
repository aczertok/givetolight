import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, isAdmin } from "@/lib/supabase/server";
import SetPassword from "@/components/SetPassword";

export const metadata = { title: "My account" };

export default async function Account({ searchParams }: { searchParams: Promise<{ reset?: string; next?: string }> }) {
  const sp = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  const admin = await isAdmin();
  const home = admin ? "/admin" : "/ambassador";
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") && sp.next !== "/ambassador" ? sp.next : home;
  const hasPassword = Boolean(user.user_metadata?.has_password);
  return (
    <main className="page wrap" style={{ maxWidth: 560 }}>
      <h1 className="section-h">My account</h1>
      {sp.reset ? (
        <SetPassword reset next={next} />
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <div className="panel">
            <p style={{ margin: 0, color: "var(--ink)", fontSize: 15 }}>You&apos;re logged in as <b>{user.email}</b>.</p>
            <p style={{ margin: 0 }}>{hasPassword ? "✓ You have a password. Log in any time with your email and password." : "Log in any time with your email and password."}</p>
            <div className="acts" style={{ marginTop: 4 }}>
              {admin && <Link className="btn" href="/admin">Go to the admin dashboard</Link>}
              <Link className={admin ? "btn ghost" : "btn"} href="/ambassador">My ambassador page</Link>
            </div>
          </div>
          <details className="panel">
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>Change my password</summary>
            <div style={{ marginTop: 12 }}><SetPassword reset={false} next="" embedded /></div>
          </details>
          <a className="btn ghost sm" style={{ justifySelf: "start" }} href="/auth/logout">Log out</a>
        </div>
      )}
    </main>
  );
}
