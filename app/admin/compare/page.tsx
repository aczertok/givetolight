import { requireAdmin } from "@/lib/admin";
import { SITE_URL } from "@/lib/format";
import { loadCompareGifts, pickPair, type CampaignLite } from "@/lib/loadGifts";
import CampaignCompare from "@/components/CampaignCompare";

export const metadata = { title: "Campaign compare" };

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ prev?: string; next?: string }> }) {
  const sp = await searchParams;
  const { sb } = await requireAdmin();
  const { data } = await sb.from("campaigns").select("id, name, slug, kind, year, status, created_at");
  const { prev, next, sorted } = pickPair((data || []) as CampaignLite[], sp.prev, sp.next);
  const [pg, ng] = await Promise.all([loadCompareGifts(sb, prev?.id || ""), loadCompareGifts(sb, next?.id || "")]);
  return <CampaignCompare campaigns={sorted.reverse()} prev={prev || null} next={next || null} prevGifts={pg} nextGifts={ng} siteUrl={SITE_URL} />;
}
