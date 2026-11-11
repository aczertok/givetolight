import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, coverFee } from "@/lib/stripe";
import { validateDonate } from "@/lib/donate";
import { resolveTarget } from "@/lib/resolve";
import { SITE_URL, ORG_NAME } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const parsed = validateDonate(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const v = parsed.v;
  const target = await resolveTarget(v.campaign, v.ambassador, v.team).catch(() => null);
  if (!target) return NextResponse.json({ error: "This campaign isn't taking donations right now." }, { status: 400 });

  // Installments: the donor pledges the total, charged monthly.
  const perPayment = v.plan === "installments" ? Math.round((v.amount / (v.months || 12)) * 100) / 100 : v.amount;
  const fee = v.coverFee ? coverFee(perPayment) : 0;
  const recurring = v.plan !== "once";
  const credited = target.ambassador ? ` (for ${target.ambassador.name})` : target.team ? ` (for ${target.team.name})` : "";
  const lineName = `Donation to ${ORG_NAME}: ${target.campaign.name}${credited}`;

  const meta: Record<string, string> = {
    campaign_id: target.campaign.id,
    ambassador_id: target.ambassador?.id || "",
    team_id: target.teamId || "",
    donor_name: v.name,
    phone: v.phone || "",
    anonymous: v.anonymous ? "1" : "",
    dedication: v.dedication || "",
    message: v.message || "",
    plan: v.plan === "installments" ? `installments:${v.months}` : v.plan === "monthly" ? "monthly" : "",
    pledge_total: String(v.amount),
    per_payment: String(perPayment),
    fee: String(fee),
  };

  const priceData = (unit: number, name: string): Stripe.Checkout.SessionCreateParams.LineItem.PriceData => ({
    currency: "usd",
    unit_amount: Math.round(unit * 100),
    product_data: { name },
    ...(recurring ? { recurring: { interval: "month" as const } } : {}),
  });
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [{ price_data: priceData(perPayment, lineName), quantity: 1 }];
  if (fee > 0) line_items.push({ price_data: priceData(fee, "Processing fee, covered by you"), quantity: 1 });

  // Which button the donor pressed. Apple Pay and Google Pay show at the top of Stripe's card page on supported devices.
  const body2 = parsed.v as typeof parsed.v & { method?: string };
  const allowed_payment_method_types: Stripe.Checkout.SessionCreateParams.AllowedPaymentMethodType[] = body2.method === "ach" ? ["us_bank_account"] : ["card"];
  const back = `${SITE_URL}/${target.campaign.slug}/donate${v.ambassador ? `?a=${v.ambassador}` : v.team ? `?t=${v.team}` : ""}`;
  try {
    const session = await stripe().checkout.sessions.create({
      mode: recurring ? "subscription" : "payment",
      allowed_payment_method_types,
      line_items,
      customer_email: v.email,
      ...(recurring ? { subscription_data: { metadata: meta } } : { submit_type: "donate", payment_intent_data: { metadata: meta } }),
      metadata: meta,
      success_url: `${SITE_URL}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: back,
    });
    // Remember the attempt so staff can follow up if it's never finished.
    await supabaseAdmin().from("checkout_starts").insert({
      session_id: session.id, campaign_id: target.campaign.id, ambassador_id: target.ambassador?.id || null, team_id: target.teamId || null,
      donor_name: v.name, donor_email: v.email.toLowerCase(), donor_phone: v.phone || null, amount: v.amount, plan: meta.plan || null, method: body2.method || "card",
    }).then(({ error }) => { if (error) console.error("checkout_starts", error); });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("checkout", e);
    return NextResponse.json({ error: "We couldn't start the payment. Please try again in a moment." }, { status: 502 });
  }
}
