import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCampaignPage } from "@/lib/data";
import CampaignLanding from "@/components/CampaignLanding";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ campaign: string }> }): Promise<Metadata> {
  const { campaign } = await params;
  const p = await getCampaignPage(campaign).catch(() => null);
  return p ? {
    title: p.campaign.name,
    description: p.campaign.tagline || `Support ${p.campaign.name} for The Lighthouse Project.`,
    openGraph: p.campaign.cover_url ? { images: [p.campaign.cover_url] } : undefined,
  } : {};
}

export default async function CampaignPage({ params }: { params: Promise<{ campaign: string }> }) {
  const { campaign: slug } = await params;
  const page = await getCampaignPage(slug);
  if (!page) notFound();
  return <CampaignLanding page={page} />;
}
