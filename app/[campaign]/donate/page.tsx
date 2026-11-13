import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaignPage } from "@/lib/data";
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
  return (
    <main className="page wrap" style={{ maxWidth: 640 }}>
      <div className="crumbs"><Link href={`/${c.slug}`}>{c.name}</Link></div>
      <h1 className="section-h" style={{ marginTop: 6 }}>Make a donation</h1>
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
  );
}
