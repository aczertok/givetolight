import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaignPage } from "@/lib/data";
import { money, ORG_NAME, ORG_EIN } from "@/lib/format";
import DonateForm from "@/components/DonateForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Donate" };

export default async function DonatePage({ params, searchParams }: { params: Promise<{ campaign: string }>; searchParams: Promise<{ a?: string; t?: string; amount?: string; plan?: string }> }) {
  const { campaign } = await params;
  const sp = await searchParams;
  const page = await getCampaignPage(campaign);
  if (!page) notFound();
  const c = page.campaign;
  if (c.status !== "live") {
    return <main className="page wrap"><div className="donors"><div className="empty">{c.name} isn&apos;t taking donations right now. <Link href={`/${c.slug}`}>Back to the campaign</Link></div></div></main>;
  }
  const amb = sp.a ? page.ambassadors.find((x) => x.slug === sp.a) : null;
  const team = sp.t ? page.teams.find((x) => x.slug === sp.t) : null;
  const pct = c.goal ? Math.min(100, (page.total / c.goal) * 100) : null;
  return (
    <div className="lc-checkout">
      <main>
        <div className="crumbs"><Link href={`/${c.slug}`}>← Back to {c.name}</Link></div>
        <h1>Complete your gift</h1>
        <DonateForm
          campaign={{ slug: c.slug, name: c.name, match: c.match_multiplier, presets: c.preset_amounts }}
          ambassadors={page.ambassadors.map((a) => ({ slug: a.slug, name: a.name }))}
          teams={page.teams.map((t) => ({ slug: t.slug, name: t.name }))}
          initialAmbassador={sp.a || ""}
          initialTeam={sp.t || ""}
          chariotCid={process.env.NEXT_PUBLIC_CHARIOT_CID || ""}
          initialAmount={sp.amount && Number.isFinite(Number(sp.amount)) && Number(sp.amount) >= 1 && Number(sp.amount) <= 250000 ? Math.round(Number(sp.amount) * 100) / 100 : undefined}
          initialPlan={sp.plan === "monthly" ? "monthly" : "once"}
        />
      </main>
      <aside className="lc-sum">
        <div className="lc-sum-card">
          <div className="lc-beam" aria-hidden="true" />
          <small>{amb ? `Supporting ${amb.name}` : team ? `Supporting team ${team.name}` : "You're supporting"}</small>
          <h2>{c.name}</h2>
          <div className="lc-raised num">{money(page.total)}</div>
          {c.goal ? <small className="num">raised of {money(c.goal)} · {page.donorCount.toLocaleString()} donors</small> : <small className="num">{page.donorCount.toLocaleString()} donors so far</small>}
          {pct !== null && <div className="lc-track" aria-hidden="true"><i style={{ width: `${Math.max(pct, 1.5).toFixed(1)}%` }} /></div>}
        </div>
        <ul>
          <li>Secure payment through Stripe</li>
          <li>Receipt emailed right away</li>
          <li>Tax-deductible: {ORG_NAME}, EIN {ORG_EIN}</li>
        </ul>
      </aside>
    </div>
  );
}
