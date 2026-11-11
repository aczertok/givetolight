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

async function uniqueSlug(db: ReturnType<typeof supabaseAdmin>, table: "ambassadors" | "teams", campaignId: string, name: string) {
  const base = slugify(name).length >= 2 ? slugify(name) : `${table === "teams" ? "team" : "amb"}-${slugify(name) || "1"}`;
  const { data } = await db.from(table).select("slug").eq("campaign_id", campaignId);
  const used = new Set((data || []).map((r) => r.slug));
  let slug = base;
  for (let i = 2; used.has(slug) || slug === "team" || slug === "donate" || slug === "join"; i++) slug = `${base}-${i}`;
  return slug;
}

export type SignupResult = { ok: boolean; error?: string; login?: boolean };

/** One-step ambassador sign-up: creates the login (if needed), the team (if new) and the ambassador page. */
export async function registerAmbassador(input: { campaign: string; name: string; email?: string; password?: string; phone?: string; goal?: string; story?: string; team?: string; newTeam?: string }): Promise<SignupResult> {
  const db = supabaseAdmin();
  const s = (v: unknown, n: number) => String(v || "").trim().slice(0, n);
  const name = s(input.name, 80);
  if (!name) return { ok: false, error: "Enter your name." };
  const { data: c } = await db.from("campaigns").select("id, slug, status, ambassador_approval").eq("slug", s(input.campaign, 80).toLowerCase()).maybeSingle();
  let user = await currentUser();
  const staffPreview = c?.status === "draft" && user ? (await (await supabaseServer()).rpc("is_admin")).data === true : false;
  if (!c || (c.status !== "live" && !staffPreview)) return { ok: false, error: "That campaign isn't open for new ambassadors yet." };

  let loginAfter = false;
  if (!user) {
    const email = s(input.email, 200).toLowerCase();
    const password = String(input.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email." };
    if (password.length < 8) return { ok: false, error: "Choose a password with at least 8 characters." };
    const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
    if (error || !created.user) {
      if (/registered|exists/i.test(error?.message || "")) return { ok: false, login: true, error: "You already have an account with this email. Log in first, then come back to join." };
      return { ok: false, error: "We couldn't create your account. Please try again." };
    }
    user = created.user;
    loginAfter = true;
  }
  const { data: existing } = await db.from("ambassadors").select("id").eq("campaign_id", c.id).eq("user_id", user.id).maybeSingle();
  if (existing) return { ok: true };

  let team_id: string | null = null;
  const newTeam = s(input.newTeam, 80);
  if (newTeam) {
    const { data: same } = await db.from("teams").select("id, name").eq("campaign_id", c.id);
    const match = (same || []).find((t) => t.name.trim().toLowerCase() === newTeam.toLowerCase());
    if (match) team_id = match.id;
    else {
      const { data: t } = await db.from("teams").insert({ campaign_id: c.id, name: newTeam, slug: await uniqueSlug(db, "teams", c.id, newTeam) }).select("id").single();
      team_id = t?.id ?? null;
    }
  } else if (s(input.team, 80)) {
    const { data: t } = await db.from("teams").select("id").eq("campaign_id", c.id).eq("slug", s(input.team, 80)).maybeSingle();
    team_id = t?.id ?? null;
  }
  const { error } = await db.from("ambassadors").insert({
    campaign_id: c.id, team_id, user_id: user.id, email: user.email, name,
    slug: await uniqueSlug(db, "ambassadors", c.id, name),
    goal: Number(s(input.goal, 12).replace(/[^\d.]/g, "")) || null,
    story: s(input.story, 1200) || null,
    phone: normPhone(s(input.phone, 30)) || null,
    status: c.ambassador_approval ? "pending" : "live",
  });
  if (error) return { ok: false, error: "We couldn't create your page. Please try again." };
  revalidatePath("/ambassador");
  revalidatePath(`/${c.slug}`);
  return { ok: true, login: loginAfter };
}
