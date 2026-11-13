"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, RESERVED } from "@/lib/admin";
import { normPhone, slugify } from "@/lib/format";

const str = (fd: FormData, k: string, max = 2000) => String(fd.get(k) ?? "").trim().slice(0, max);
const numOrNull = (fd: FormData, k: string) => {
  const v = str(fd, k, 20);
  return v === "" ? null : Number(v);
};
// Date/time boxes are filled in New York time; store the exact moment.
const dateOrNull = (fd: FormData, k: string) => {
  const v = str(fd, k, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return null;
  const asUtc = new Date(v.slice(0, 16) + ":00Z");
  const ny = new Date(asUtc.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const utc = new Date(asUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(asUtc.getTime() + (utc.getTime() - ny.getTime())).toISOString();
};

function campaignFields(fd: FormData) {
  const presets = str(fd, "preset_amounts", 200)
    .split(/[,\s]+/)
    .map((x) => Math.round(Number(x)))
    .filter((x) => x > 0)
    .slice(0, 9);
  return {
    name: str(fd, "name", 120),
    kind: str(fd, "kind", 20) || "other",
    year: numOrNull(fd, "year"),
    tagline: str(fd, "tagline", 200) || null,
    story: str(fd, "story", 6000) || null,
    cover_url: str(fd, "cover_url", 500) || null,
    goal: numOrNull(fd, "goal"),
    match_multiplier: Math.max(1, Number(str(fd, "match_multiplier", 6)) || 1),
    match_cap: numOrNull(fd, "match_cap"),
    match_note: str(fd, "match_note", 140) || null,
    starts_at: dateOrNull(fd, "starts_at"),
    ends_at: dateOrNull(fd, "ends_at"),
    status: ["draft", "live", "ended"].includes(str(fd, "status")) ? str(fd, "status") : "draft",
    show_on_home: fd.get("show_on_home") === "on",
    ambassador_approval: fd.get("ambassador_approval") === "on",
    ...(presets.length ? { preset_amounts: presets } : {}),
  };
}

export async function createCampaign(fd: FormData) {
  const { sb } = await requireAdmin();
  const fields = campaignFields(fd);
  const slug = slugify(str(fd, "slug", 60) || fields.name);
  if (!fields.name) redirect("/admin/campaigns/new?error=name");
  if (RESERVED.has(slug)) redirect("/admin/campaigns/new?error=reserved");
  const { data, error } = await sb.from("campaigns").insert({ ...fields, slug }).select("id").single();
  if (error) redirect(`/admin/campaigns/new?error=${error.code === "23505" ? "taken" : "save"}`);
  revalidatePath("/");
  redirect(`/admin/campaigns/${data.id}?created=1`);
}

export async function updateCampaign(fd: FormData) {
  const { sb } = await requireAdmin();
  const id = str(fd, "id", 60);
  const slug = slugify(str(fd, "slug", 60));
  if (RESERVED.has(slug)) redirect(`/admin/campaigns/${id}?error=reserved`);
  const { error } = await sb.from("campaigns").update({ ...campaignFields(fd), slug }).eq("id", id);
  if (error) redirect(`/admin/campaigns/${id}?error=${error.code === "23505" ? "taken" : "save"}`);
  revalidatePath("/", "layout");
  redirect(`/admin/campaigns/${id}?saved=1`);
}

export async function addTeam(fd: FormData) {
  const { sb } = await requireAdmin();
  const campaign_id = str(fd, "campaign_id", 60);
  const name = str(fd, "name", 80);
  if (name) {
    const { data: existing } = await sb.from("teams").select("slug").eq("campaign_id", campaign_id);
    const used = new Set((existing || []).map((t) => t.slug));
    const base = slugify(name).length >= 2 ? slugify(name) : `team-${slugify(name) || "1"}`;
    let slug = base;
    for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
    await sb.from("teams").insert({ campaign_id, name, slug, goal: numOrNull(fd, "goal"), blurb: str(fd, "blurb", 300) || null });
  }
  revalidatePath("/", "layout");
  redirect(`/admin/campaigns/${campaign_id}?tab=teams`);
}

export async function updateTeam(fd: FormData) {
  const { sb } = await requireAdmin();
  const id = str(fd, "id", 60);
  const campaign_id = str(fd, "campaign_id", 60);
  if (fd.get("delete") === "1") await sb.from("teams").delete().eq("id", id);
  else await sb.from("teams").update({ name: str(fd, "name", 80), goal: numOrNull(fd, "goal"), blurb: str(fd, "blurb", 300) || null, photo_url: str(fd, "photo_url", 500) || null }).eq("id", id);
  revalidatePath("/", "layout");
  redirect(`/admin/campaigns/${campaign_id}?tab=teams`);
}

export async function setAmbassadorStatus(fd: FormData) {
  const { sb } = await requireAdmin();
  const id = str(fd, "id", 60);
  const status = str(fd, "status", 10);
  if (["pending", "live", "hidden"].includes(status)) await sb.from("ambassadors").update({ status }).eq("id", id);
  revalidatePath("/admin/ambassadors");
  revalidatePath("/admin", "layout");
}

export async function adminAddAmbassador(fd: FormData) {
  const { sb } = await requireAdmin();
  const campaign_id = str(fd, "campaign_id", 60);
  const name = str(fd, "name", 80);
  if (!name) return;
  let slug = slugify(name);
  for (let i = 2; i < 50; i++) {
    const { data } = await sb.from("ambassadors").select("id").eq("campaign_id", campaign_id).eq("slug", slug).maybeSingle();
    if (!data && slug !== "team" && slug !== "donate") break;
    slug = `${slugify(name)}-${i}`;
  }
  await sb.from("ambassadors").insert({
    campaign_id,
    name,
    slug,
    team_id: str(fd, "team_id", 60) || null,
    goal: numOrNull(fd, "goal"),
    phone: normPhone(str(fd, "phone", 30)) || null,
    email: str(fd, "email", 200).toLowerCase() || null,
    status: "live",
  });
  revalidatePath("/admin/ambassadors");
  revalidatePath("/", "layout");
  redirect(`/admin/campaigns/${campaign_id}?tab=ambassadors`);
}

export async function addOfflineGift(fd: FormData) {
  const { sb, user } = await requireAdmin();
  const campaign_id = str(fd, "campaign_id", 60);
  const amount = Number(str(fd, "amount", 20));
  const back = `/admin/donations?c=${campaign_id}`;
  if (!campaign_id || !(amount > 0)) redirect(`${back}&error=offline`);
  const ambassador_id = str(fd, "ambassador_id", 60) || null;
  let team_id = str(fd, "team_id", 60) || null;
  if (ambassador_id && !team_id) {
    const { data } = await sb.from("ambassadors").select("team_id").eq("id", ambassador_id).maybeSingle();
    team_id = data?.team_id ?? null;
  }
  const when = str(fd, "date", 20);
  const { error } = await sb.from("donations").insert({
    campaign_id,
    ambassador_id,
    team_id,
    donor_name: str(fd, "donor_name", 120),
    donor_email: str(fd, "donor_email", 200).toLowerCase() || null,
    donor_phone: normPhone(str(fd, "donor_phone", 30)) || null,
    anonymous: fd.get("anonymous") === "on",
    dedication: str(fd, "dedication", 140) || null,
    message: str(fd, "message", 280) || null,
    amount,
    method: str(fd, "method", 20) || "check",
    method_detail: str(fd, "method_detail", 80) || null,
    provider: "offline",
    status: "succeeded",
    entered_by: user.id,
    ...(when ? { created_at: new Date(when + "T12:00:00").toISOString() } : {}),
  });
  if (error) redirect(`${back}&error=offline`);
  revalidatePath("/", "layout");
  redirect(`${back}&added=1`);
}

export async function setDonationStatus(fd: FormData) {
  const { sb } = await requireAdmin();
  const status = str(fd, "status", 12);
  if (["pending", "succeeded", "failed", "refunded"].includes(status)) await sb.from("donations").update({ status }).eq("id", str(fd, "id", 60));
  revalidatePath("/admin/donations");
}

// ---- outreach (called from the client with plain arguments) ----
export async function markTexted(campaignId: string, keys: string[], undo = false) {
  const { sb } = await requireAdmin();
  const clean = keys.filter((k) => typeof k === "string" && k.length < 200).slice(0, 5000);
  if (undo) {
    await sb.from("outreach").delete().eq("campaign_id", campaignId).in("donor_key", clean);
  } else {
    const now = new Date().toISOString();
    for (let i = 0; i < clean.length; i += 500) {
      await sb.from("outreach").upsert(clean.slice(i, i + 500).map((donor_key) => ({ campaign_id: campaignId, donor_key, texted_at: now })));
    }
  }
  return true;
}

export async function setDoNotText(key: string, on: boolean) {
  const { sb } = await requireAdmin();
  if (on) await sb.from("do_not_text").upsert({ donor_key: key });
  else await sb.from("do_not_text").delete().eq("donor_key", key);
  return true;
}

export async function saveTemplates(fd: FormData) {
  const { sb } = await requireAdmin();
  await sb.from("message_templates").upsert([
    { id: "donor", body: str(fd, "donor", 600) },
    { id: "ambassador", body: str(fd, "ambassador", 600) },
  ]);
  revalidatePath("/admin/outreach");
}

// ---- import (rows already parsed in the browser) ----
export type ImportRow = { name: string; email: string; phone: string; amount: number; date: string; method: string; ambassador: string; team: string; anonymous: boolean };

export async function importGifts(campaignId: string, rows: ImportRow[], replace: boolean) {
  const { sb, user } = await requireAdmin();
  if (!campaignId || !Array.isArray(rows)) return { ok: false, error: "Nothing to import." };
  if (replace) await sb.from("donations").delete().eq("campaign_id", campaignId).eq("provider", "import");
  const clean = rows
    .filter((r) => r && Number(r.amount) > 0)
    .slice(0, 20000)
    .map((r) => ({
      campaign_id: campaignId,
      donor_name: String(r.name || "").slice(0, 120),
      donor_email: String(r.email || "").toLowerCase().slice(0, 200) || null,
      donor_phone: normPhone(r.phone) || null,
      anonymous: !!r.anonymous,
      amount: Math.round(Number(r.amount) * 100) / 100,
      method: String(r.method || "").slice(0, 40) || null,
      ambassador_name: String(r.ambassador || "").slice(0, 120) || null,
      team_name: String(r.team || "").slice(0, 120) || null,
      provider: "import",
      status: "succeeded",
      entered_by: user.id,
      created_at: /^\d{4}-\d{2}-\d{2}/.test(r.date) ? new Date(r.date.slice(0, 10) + "T12:00:00Z").toISOString() : new Date().toISOString(),
    }));
  for (let i = 0; i < clean.length; i += 500) {
    const { error } = await sb.from("donations").insert(clean.slice(i, i + 500));
    if (error) return { ok: false, error: `Stopped after ${i} gifts: ${error.message}` };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, count: clean.length };
}

export async function setCampaignStatus(fd: FormData) {
  const { sb } = await requireAdmin();
  const id = str(fd, "id", 60);
  const status = str(fd, "status", 10);
  if (!["draft", "live", "ended"].includes(status)) redirect(`/admin/campaigns/${id}?error=save`);
  const { error } = await sb.from("campaigns").update({ status }).eq("id", id);
  if (error) redirect(`/admin/campaigns/${id}?error=save`);
  revalidatePath("/", "layout");
  redirect(`/admin/campaigns/${id}?saved=1`);
}
