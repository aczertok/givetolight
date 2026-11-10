import { NextResponse } from "next/server";
import { validateDonate } from "@/lib/donate";
import { resolveTarget } from "@/lib/resolve";
import { supabaseAdmin } from "@/lib/supabase/server";

// Called after the donor finishes in Chariot's DAFpay window (the CHARIOT_SUCCESS event).
// Docs: https://docs.givechariot.com/guides/dafpay/integrating-dafpay/integration
//       https://docs.givechariot.com/api/grants/create
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = validateDonate(body?.form);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const v = parsed.v;
  const session = String(body?.workflowSessionId || "");
  const intent = body?.grantIntent || body?.recurringGrantIntent;
  const cents = Number(intent?.amount);
  if (!session || !(cents > 0)) return NextResponse.json({ error: "The DAF grant details were missing." }, { status: 400 });
  const target = await resolveTarget(v.campaign, v.ambassador, v.team).catch(() => null);
  if (!target) return NextResponse.json({ error: "This campaign isn't taking donations right now." }, { status: 400 });

  const token = process.env.CHARIOT_API_KEY;
  if (!token) return NextResponse.json({ error: "DAF giving isn't set up yet." }, { status: 503 });
  const recurring = Boolean(body?.recurringGrantIntent);
  const api = (process.env.CHARIOT_API_URL || "https://api.givechariot.com").replace(/\/$/, ""); // set to Chariot's sandbox address while testing
  const res = await fetch(`${api}/v1/${recurring ? "recurring_grants" : "grants"}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      workflowSessionId: session,
      amount: cents, // Chariot: the amount from the success payload, in cents
      ...(recurring ? { frequency: "MONTHLY" } : {}),
      note: [v.dedication, v.message].filter(Boolean).join(" · ").slice(0, 400) || undefined,
    }),
  });
  const grant = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("chariot grant", res.status, grant);
    return NextResponse.json({ error: "Your DAF provider received the request, but we couldn't confirm it. Please contact us so we can record your gift." }, { status: 502 });
  }
  const { error } = await supabaseAdmin().from("donations").upsert(
    {
      campaign_id: target.campaign.id,
      ambassador_id: target.ambassador?.id || null,
      team_id: target.teamId,
      donor_name: v.name,
      donor_email: v.email,
      donor_phone: v.phone || null,
      anonymous: !!v.anonymous,
      dedication: v.dedication || null,
      message: v.message || null,
      amount: cents / 100,
      method: "daf",
      method_detail: grant?.fundId || intent?.fundId || null,
      provider: "chariot",
      provider_ref: grant?.id || session,
      plan: recurring ? "monthly" : null,
      status: "succeeded",
    },
    { onConflict: "provider_ref", ignoreDuplicates: true }
  );
  if (error) console.error("record grant", error);
  return NextResponse.json({ ok: true, ref: grant?.id || session });
}
