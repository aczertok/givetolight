import { getCampaignPage } from "@/lib/data";
import { money } from "@/lib/format";
import { volleyball2027Template } from "@/lib/volleyball2027-template";

// This event has its own immersive, responsive campaign presentation.
// All financial figures and individual/team amounts use current Supabase data.
// The real DonateForm and payment APIs remain on /volley2027/donate.
export const dynamic = "force-dynamic";

export async function GET() {
  const page = await getCampaignPage("volley2027").catch(() => null);
  if (!page) {
    return new Response(
      "<!DOCTYPE html><html lang=\"en\"><head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Campaign unavailable</title></head><body><main style=\"font:16px system-ui;max-width:600px;margin:80px auto;padding:20px\"><h1>Campaign not available</h1><p>Check back for upcoming Lighthouse fundraising campaigns.</p><a href=\"/\">View other campaigns</a></main></body></html>",
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const c = page.campaign;
  // Exclude hypothetical match dollars when displaying actual funds donated.
  // The campaign's matching configuration must also be disabled by staff in admin
  // if matching is no longer part of the fundraising program.
  const raised = page.raised;
  const goal = c.goal && c.goal > 0 ? c.goal : null;
  const pct = goal ? Math.min(100, Math.max(0, Math.round((raised / goal) * 100))) : 0;
  const toGo = goal ? Math.max(0, goal - raised) : null;
  const presets = [...new Set((c.preset_amounts || [])
    .map(Number)
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 250000))].slice(0, 4);
  const payload = {
    slug: c.slug,
    status: c.status,
    tagline: c.tagline || "",
    presets: presets.length ? presets : [72, 180, 360, 1000],
    dafAvailable: !!process.env.NEXT_PUBLIC_CHARIOT_CID,
    ambassadors: page.ambassadors.map(a => ({
      slug: a.slug, name: a.name, raised: a.raised, goal: a.goal, photo_url: a.photo_url,
    })),
    teams: page.teams.map(t => ({
      slug: t.slug, name: t.name, raised: t.raised, goal: t.goal, photo_url: t.photo_url,
    })),
  };
  const safeJson = JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
  let html = volleyball2027Template
    .replace("__VB_DATA__", safeJson)
    .replace(/__VB_RAISED__/g, money(raised))
    .replace(/__VB_GOAL__/g, goal ? money(goal) : "Every gift counts")
    .replace(/__VB_PCT__/g, String(pct))
    .replace(/__VB_LEFT__/g, toGo == null ? "" : money(toGo))
    .replace(/__VB_DONORS__/g, page.donorCount.toLocaleString("en-US"))
    .replace(/__VB_AMBASSADORS__/g, page.ambassadors.length.toLocaleString("en-US"))
    .replace(/__VB_TEAMS__/g, page.teams.length.toLocaleString("en-US"))
    .replace("__VB_DAF_METHOD__", payload.dafAvailable ? '<span class="method daf"><i>✳</i>DAF</span>' : "");

  // Avoid implying a target exists where the campaign has none.
  if (!goal) {
    html = html.replace(/<div class="bar"[\s\S]*?<\/div><div class="bar-meta">[\s\S]*?<\/div>/, "");
  }

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
