import { currentUser } from "@/lib/supabase/server";

export default async function NotAllowed() {
  const user = await currentUser();
  return (
    <div className="panel" style={{ maxWidth: 620 }}>
      <h2>This area is for Lighthouse staff</h2>
      <p>You&apos;re logged in as {user?.email}, which isn&apos;t a staff account. If you should have access, ask Alex to add you.</p>
      <p className="meta">Adding a staff member: in Supabase, open SQL Editor and run <code>insert into admins (user_id) select id from auth.users where email = &apos;their@email.com&apos;;</code> after they&apos;ve logged in here once.</p>
    </div>
  );
}
