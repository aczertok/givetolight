import { supabaseAdmin } from "@/lib/supabase/server";

/** Server-side: the live campaign plus the ambassador/team the gift is credited to. */
export async function resolveTarget(campaignSlug: string, ambassadorSlug?: string, teamSlug?: string) {
  const db = supabaseAdmin();
  const { data: campaign } = await db.from("campaigns").select("id, slug, name, status").eq("slug", campaignSlug).maybeSingle();
  if (!campaign || campaign.status !== "live") return null;
  let ambassador: { id: string; name: string; team_id: string | null } | null = null;
  let team: { id: string; name: string } | null = null;
  if (ambassadorSlug) {
    const { data } = await db.from("ambassadors").select("id, name, team_id, status").eq("campaign_id", campaign.id).eq("slug", ambassadorSlug).maybeSingle();
    if (data && data.status === "live") ambassador = data;
  }
  if (teamSlug) {
    const { data } = await db.from("teams").select("id, name").eq("campaign_id", campaign.id).eq("slug", teamSlug).maybeSingle();
    if (data) team = data;
  }
  return { campaign, ambassador, team, teamId: team?.id || ambassador?.team_id || null };
}
