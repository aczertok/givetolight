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
          <span className="lh-brand-mark"><img src="/lighthouse-mark.svg" alt="The Monsey Lighthouse" width="43" height="43" /></span>
          <span>
            {SITE_NAME}
            <small>The Lighthouse Project</small>
          </span>
        </Link>
        <nav className="site-nav" aria-label="Main">
          <Link href="/">Campaigns</Link>
          <Link href="/ambassador">{user ? "My ambassador page" : "Become an ambassador"}</Link>
          {admin && <Link href="/admin">Admin</Link>}
          {user ? <Link href="/account">My account</Link> : <Link href="/login">Log in</Link>}
        </nav>
      </div>
    </header>
  );
}
