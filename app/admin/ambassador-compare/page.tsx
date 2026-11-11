import { requireAdmin } from "@/lib/admin";
import { normPhone, SITE_URL } from "@/lib/format";
import { loadCompareGifts, pickPair, type CampaignLite } from "@/lib/loadGifts";
import AmbassadorCompare, { type CAmb } from "@/components/AmbassadorCompare";

export const metadata = { title: "Ambassador compare" };

export default async function Page({ searchParams }: { searchParams: Promise<{ prev?: string; next?: string }> }) {
  const sp = await searchParams;
  const { sb } = await requireAdmin();
  const { data } = await sb.from("campaigns").select("id, name, slug, kind, year, status, created_at");
  const { prev, next, sorted } = pickPair((data || []) as CampaignLite[], sp.prev, sp.next);
  const ids = [prev?.id, next?.id].filter(Boolean) as string[];
  const [pg, ng] = await Promise.all([loadCompareGifts(sb, prev?.id || ""), loadCompareGifts(sb, next?.id || "")]);
  const { data: ambs } = ids.length ? await sb.from("ambassadors").select("campaign_id, name, slug, goal, phone, email, status, team_id").in("campaign_id", ids) : { data: [] };
  const { data: teams } = ids.length ? await sb.from("teams").select("id, name").in("campaign_id", ids) : { data: [] };
  const tn = new Map((teams || []).map((t) => [t.id, t.name]));
  const list: CAmb[] = (ambs || []).map((a) => ({ side: a.campaign_id === next?.id ? "next" : "prev", name: a.name, slug: a.slug, goal: a.goal ? Number(a.goal) : null, phone: normPhone(a.phone), email: a.email || "", status: a.status, team: (a.team_id && tn.get(a.team_id)) || "" }));
  return <AmbassadorCompare campaigns={sorted.reverse()} prev={prev || null} next={next || null} prevGifts={pg} nextGifts={ng} ambassadors={list} siteUrl={SITE_URL} />;
}
