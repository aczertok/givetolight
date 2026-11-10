import Link from "next/link";
import { currentUser, isAdmin } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/format";

export default async function SiteHeader() {
  const user = await currentUser().catch(() => null);
  const admin = user ? await isAdmin().catch(() => false) : false;
  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="brand">
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <path d="M10 24h6l-1.2-14h-3.6z" fill="#f3efe3" />
            <rect x="10.4" y="6" width="5.2" height="4" rx="1" fill="#d9a33f" />
            <path d="M13 3l3 3h-6z" fill="#f3efe3" />
            <path d="M16.5 7.5l7-2.5v5zM9.5 7.5l-7-2.5v5z" fill="#d9a33f" opacity=".55" />
          </svg>
          <span>
            {SITE_NAME}
            <small>The Lighthouse Project</small>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Main">
          <Link href="/">Campaigns</Link>
          <Link href="/ambassador">{user ? "My ambassador page" : "Become an ambassador"}</Link>
          {admin && <Link href="/admin">Admin</Link>}
          {!user && <Link href="/login">Log in</Link>}
        </nav>
      </div>
    </header>
  );
}
