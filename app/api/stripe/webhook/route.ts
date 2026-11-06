import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

// Stripe → Developers → Webhooks: send these events to https://givetolight.com/api/stripe/webhook
// checkout.session.completed, checkout.session.async_payment_succeeded,
// checkout.session.async_payment_failed, invoice.paid, charge.refunded

function methodOf(types: string[] | undefined): string {
  const t = types?.[0];
  return t === "us_bank_account" ? "ach" : t || "card";
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get("stripe-signature");
  if (!secret || !sig) return NextResponse.json({ error: "not configured" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), sig, secret);
  } catch {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }
  const db = supabaseAdmin();

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as Stripe.Checkout.Session;
    const m = s.metadata || {};
    if (!m.campaign_id) return NextResponse.json({ ok: true });
    const paid = s.payment_status === "paid" || s.payment_status === "no_payment_required";
    const plan = m.plan || null;
    // Installments count the full pledge now; monthly counts each payment as it arrives.
    const amount = plan?.startsWith("installments:") ? Number(m.pledge_total) : Number(m.per_payment || m.pledge_total);
    const row = {
      campaign_id: m.campaign_id,
      ambassador_id: m.ambassador_id || null,
      team_id: m.team_id || null,
      donor_name: m.donor_name || s.customer_details?.name || "",
      donor_email: s.customer_details?.email || s.customer_email || null,
      donor_phone: m.phone || s.customer_details?.phone || null,
      anonymous: m.anonymous === "1",
      dedication: m.dedication || null,
      message: m.message || null,
      amount,
      fee_covered: Number(m.fee || 0),
      method: methodOf(s.payment_method_types),
      provider: "stripe",
      provider_ref: s.id,
      plan,
      status: paid ? "succeeded" : "pending",
    };
    const { error } = await db.from("donations").upsert(row, { onConflict: "provider_ref", ignoreDuplicates: true });
    if (error) {
      console.error("record donation", error);
      return NextResponse.json({ error: "db" }, { status: 500 });
    }
    // Installments: stop the subscription after the last payment.
    if (plan?.startsWith("installments:") && s.subscription) {
      const months = Number(plan.split(":")[1]) || 12;
      const end = new Date();
      end.setMonth(end.getMonth() + months - 1);
      end.setDate(end.getDate() + 3);
      await stripe().subscriptions.update(String(s.subscription), { cancel_at: Math.floor(end.getTime() / 1000) }).catch((e) => console.error("cancel_at", e));
    }
  }

  if (event.type === "checkout.session.async_payment_succeeded" || event.type === "checkout.session.async_payment_failed") {
    const s = event.data.object as Stripe.Checkout.Session;
    await db.from("donations").update({ status: event.type.endsWith("succeeded") ? "succeeded" : "failed" }).eq("provider_ref", s.id);
  }

  if (event.type === "invoice.paid") {
    const inv = event.data.object as Stripe.Invoice;
    // The first invoice is recorded by checkout.session.completed; later monthly payments are new gifts.
    if (inv.billing_reason === "subscription_cycle") {
      const m = inv.parent?.subscription_details?.metadata || {};
      if (m.campaign_id && m.plan === "monthly") {
        await db.from("donations").upsert(
          {
            campaign_id: m.campaign_id,
            ambassador_id: m.ambassador_id || null,
            team_id: m.team_id || null,
            donor_name: m.donor_name || inv.customer_name || "",
            donor_email: inv.customer_email,
            donor_phone: m.phone || null,
            anonymous: m.anonymous === "1",
            dedication: m.dedication || null,
            amount: Number(m.per_payment),
            fee_covered: Number(m.fee || 0),
            method: "card",
            provider: "stripe",
            provider_ref: inv.id,
            plan: "monthly",
            status: "succeeded",
          },
          { onConflict: "provider_ref", ignoreDuplicates: true }
        );
      }
    }
  }

  if (event.type === "charge.refunded") {
    const ch = event.data.object as Stripe.Charge;
    if (ch.refunded && ch.payment_intent) {
      const sessions = await stripe().checkout.sessions.list({ payment_intent: String(ch.payment_intent), limit: 1 });
      const sid = sessions.data[0]?.id;
      if (sid) await db.from("donations").update({ status: "refunded" }).eq("provider_ref", sid);
    }
  }
  return NextResponse.json({ ok: true });
}
