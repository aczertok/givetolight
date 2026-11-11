import { redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import SetPassword from "@/components/SetPassword";

export const metadata = { title: "My account" };

export default async function Account({ searchParams }: { searchParams: Promise<{ reset?: string; next?: string }> }) {
  const sp = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/login?next=/account");
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "";
  return (
    <main className="page wrap" style={{ maxWidth: 480 }}>
      <h1 className="section-h">My account</h1>
      <p className="meta" style={{ marginBottom: 16 }}>Signed in as <b>{user.email}</b>.</p>
      <SetPassword reset={!!sp.reset} next={next} />
      <p style={{ marginTop: 16 }}><a className="btn ghost sm" href="/auth/logout">Log out</a></p>
    </main>
  );
}
