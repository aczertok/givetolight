import Stripe from "stripe";

let client: Stripe | null = null;
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  client ??= new Stripe(key);
  return client;
}

/** Stripe's standard US card rate, used for the "cover the fees" option. */
export function coverFee(amount: number): number {
  return Math.round(((amount + 0.3) / (1 - 0.029) - amount) * 100) / 100;
}
