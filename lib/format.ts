export const ORG_NAME = process.env.NEXT_PUBLIC_ORG_NAME || "The Lighthouse Project";
export const ORG_EIN = process.env.NEXT_PUBLIC_ORG_EIN || "84-3301528";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://givetolight.com").replace(/\/$/, "");

export function money(n: number | string | null | undefined, cents = false): string {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(v);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "page";
}

export function firstName(name: string): string {
  const w = (name || "").trim().split(/\s+/);
  return w.length > 1 ? w.slice(0, -1).join(" ") : w[0] || "there";
}

export function initials(name: string): string {
  return (
    (name || "")
      .replace(/[^A-Za-z ]/g, "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "♥"
  );
}

export function timeAgo(iso: string): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  const d = Math.floor(m / 1440);
  return d < 30 ? `${d}d ago` : new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function paragraphs(text: string | null | undefined): string[] {
  return (text || "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

export function normPhone(p: string | null | undefined): string {
  let d = (p || "").replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") d = d.slice(1);
  if (d.length === 10) return "+1" + d;
  return d.length >= 11 ? "+" + d : "";
}

export function fmtPhone(p: string | null | undefined): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(p || "");
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : p || "";
}

export function timeLeft(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const d = Math.floor(ms / 864e5);
  const h = Math.floor(ms / 36e5) % 24;
  if (d >= 2) return `${d} days left`;
  if (d === 1) return `1 day ${h} hrs left`;
  const m = Math.floor(ms / 6e4) % 60;
  return `${Math.floor(ms / 36e5)} hrs ${m} min left`;
}
