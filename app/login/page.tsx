import LoginForm from "@/components/LoginForm";

export const metadata = { title: "Log in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/go";
  return (
    <main className="page wrap" style={{ maxWidth: 480 }}>
      <h1 className="section-h">Log in</h1>
      <p className="meta" style={{ marginBottom: 16 }}>For ambassadors and staff.</p>
      {sp.error && <p className="error">That link didn&apos;t work or has expired. Log in below or request a new one.</p>}
      <LoginForm next={next} />
    </main>
  );
}
