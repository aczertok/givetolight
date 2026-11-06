import Link from "next/link";
import { stripe } from "@/lib/stripe";
import { money, ORG_NAME, ORG_EIN } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thank you" };

export default async function ThankYou({ searchParams }: { searchParams: Promise<{ session_id?: string; daf?: string; c?: string }> }) {
  const sp = await searchParams;
  let name = "";
  let amount = "";
  let slug = sp.c || "";
  let pending = false;
  if (sp.session_id) {
    try {
      const s = await stripe().checkout.sessions.retrieve(sp.session_id);
      const m = s.metadata || {};
      name = (m.donor_name || "").split(" ")[0];
      amount = m.plan?.startsWith("installments:") ? money(Number(m.pledge_total)) : money(Number(m.per_payment || 0));
      pending = s.payment_status === "unpaid";
    } catch {
      // show the plain thank-you
    }
  }
  return (
    <main className="page wrap" style={{ maxWidth: 640, textAlign: "center" }}>
      <h1 className="section-h">Thank you{name ? `, ${name}` : ""}!</h1>
      {amount ? (
        <p>Your gift of <b>{amount}</b> {pending ? "is processing. Bank transfers take a few days to clear." : "went through."}</p>
      ) : sp.daf ? (
        <p>Your donor-advised fund grant has been requested. Your fund will send it to {ORG_NAME}.</p>
      ) : (
        <p>Your gift means a great deal to the girls at {ORG_NAME}.</p>
      )}
      <p className="meta">A receipt is on its way to your email. {ORG_NAME}, EIN {ORG_EIN}.</p>
      <p style={{ marginTop: 24 }}><Link className="btn ghost" href={slug ? `/${slug}` : "/"}>Back to the campaign</Link></p>
    </main>
  );
}
