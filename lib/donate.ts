// Shared validation for the donate form, used by both checkout routes.
export type DonateInput = {
  campaign: string; // slug
  ambassador?: string; // slug
  team?: string; // slug
  amount: number; // dollars per payment (one-time or monthly); total for installments is amount
  plan: "once" | "monthly" | "installments";
  months?: number;
  name: string;
  email: string;
  phone?: string;
  anonymous?: boolean;
  dedication?: string;
  message?: string;
  coverFee?: boolean;
};

export function validateDonate(body: unknown): { ok: true; v: DonateInput } | { ok: false; error: string } {
  const b = (body || {}) as Record<string, unknown>;
  const s = (k: string, max = 200) => (typeof b[k] === "string" ? (b[k] as string).trim().slice(0, max) : "");
  const amount = Math.round(Number(b.amount) * 100) / 100;
  if (!(amount >= 1)) return { ok: false, error: "Enter an amount of at least $1." };
  if (amount > 250000) return { ok: false, error: "For gifts over $250,000, please contact us directly." };
  const plan = b.plan === "monthly" || b.plan === "installments" ? b.plan : "once";
  const months = plan === "installments" ? Math.max(2, Math.min(36, Math.round(Number(b.months) || 12))) : undefined;
  const name = s("name", 120);
  const email = s("email", 200).toLowerCase();
  if (!name) return { ok: false, error: "Enter your name for the receipt." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email for the receipt." };
  return {
    ok: true,
    v: {
      campaign: s("campaign", 80),
      ambassador: s("ambassador", 80) || undefined,
      team: s("team", 80) || undefined,
      amount,
      plan,
      months,
      name,
      email,
      phone: s("phone", 30) || undefined,
      anonymous: b.anonymous === true,
      dedication: s("dedication", 140) || undefined,
      message: s("message", 280) || undefined,
      coverFee: b.coverFee === true,
    },
  };
}
