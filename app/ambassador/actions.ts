"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { currentUser, supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { normPhone, slugify } from "@/lib/format";

const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) || "").trim().slice(0, max);

export async function joinCampaign(fd: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/ambassador");
  const db = supabaseAdmin();
  const { data: c } = await db.from("campaigns").select("id, slug, status, ambassador_approval").eq("slug", str(fd, "campaign", 80)).maybeSingle();
  if (!c || c.status !== "live") redirect("/ambassador?error=closed");
  const { data: existing } = await db.from("ambassadors").select("id").eq("campaign_id", c.id).eq("user_id", user.id).maybeSingle();
  if (existing) redirect("/ambassador");

  const name = str(fd, "name", 80);
  if (!name) redirect(`/ambassador?join=${c.slug}&error=name`);
  const teamSlug = str(fd, "team", 80);
  let team_id: string | null = null;
  if (teamSlug) {
    const { data: t } = await db.from("teams").select("id").eq("campaign_id", c.id).eq("slug", teamSlug).maybeSingle();
    team_id = t?.id ?? null;
  }
  const base = slugify(name);
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const { data: taken } = await db.from("ambassadors").select("id").eq("campaign_id", c.id).eq("slug", slug).maybeSingle();
    if (!taken && slug !== "team" && slug !== "donate") break;
    slug = `${base}-${i}`;
  }
  const goal = Number(str(fd, "goal", 12)) || null;
  const { error } = await db.from("ambassadors").insert({
    campaign_id: c.id,
    team_id,
    user_id: user.id,
    email: user.email,
    slug,
    name,
    goal,
    story: str(fd, "story", 1200) || null,
    phone: normPhone(str(fd, "phone", 30)) || null,
    status: c.ambassador_approval ? "pending" : "live",
  });
  if (error) redirect(`/ambassador?join=${c.slug}&error=save`);
  revalidatePath("/ambassador");
  redirect("/ambassador?joined=1");
}

export async function updateMyPage(fd: FormData) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/ambassador");
  const sb = await supabaseServer(); // row-level security: only your own page, status stays with staff
  const id = str(fd, "id", 60);
  const goal = Number(str(fd, "goal", 12)) || null;
  const patch: Record<string, unknown> = {
    name: str(fd, "name", 80),
    goal,
    story: str(fd, "story", 1200) || null,
    phone: normPhone(str(fd, "phone", 30)) || null,
  };
  const photo = str(fd, "photo_url", 500);
  if (photo) patch.photo_url = photo;
  if (fd.get("remove_photo") === "1") patch.photo_url = null;
  await sb.from("ambassadors").update(patch).eq("id", id).eq("user_id", user.id);
  revalidatePath("/ambassador");
  redirect("/ambassador?saved=1");
}
