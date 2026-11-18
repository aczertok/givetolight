import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";

export default async function NotAllowed() {
  const user = await currentUser();
  return (
    <div className="panel" style={{ maxWidth: 620 }}>
      <h2>Staff access isn't enabled for this account</h2>
      <p>You are signed in as <b>{user?.email || "an unrecognized account"}</b>, but this account does not currently have staff permissions.</p>
      <p>Make sure you used the same email address as your existing Lighthouse admin account. If this is your correct email, your staff role needs to be checked in the site administrator settings.</p>
      <div className="acts">
        <Link className="btn ghost" href="/account">Check my account</Link>
        <Link className="btn ghost" href="/login?next=/admin">Return to login</Link>
      </div>
    </div>
  );
}
