import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Log in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/ambassador";
  return (
    <main className="page wrap" style={{ maxWidth: 480 }}>
      <h1 className="section-h">Log in</h1>
      <p className="meta" style={{ marginBottom: 16 }}>Ambassadors and staff log in with their email. We&apos;ll send you a link; there&apos;s no password to remember.</p>
      {sp.error && <p className="error">That sign-in link didn&apos;t work or has expired. Request a new one below.</p>}
      <LoginForm next={next} />
    </main>
  );
}
