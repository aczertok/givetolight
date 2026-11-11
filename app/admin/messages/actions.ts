"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { sendEmails, fill, toHtml, emailConfigured } from "@/lib/email";

export type Recipient = { name: string; email: string; phone?: string; vars?: Record<string, string> };
export type SendInput = { campaignId?: string | null; kind?: "compose" | "donor_list" | "recovery"; recipientType: "donors" | "ambassadors"; subject: string; body: string; recipients: Recipient[] };

const firstOf = (n: string) => { const w = (n || "").trim().split(/\s+/); return w.length > 1 ? w.slice(0, -1).join(" ") : w[0] || "friend"; };

export async function sendMessage(input: SendInput): Promise<{ ok: boolean; sent: number; failed: number; skipped: number; error?: string }> {
  const { sb, user } = await requireAdmin();
  if (!emailConfigured()) return { ok: false, sent: 0, failed: 0, skipped: 0, error: "Email sending isn't connected yet (add RESEND_API_KEY in Vercel)." };
  const subject = String(input.subject || "").slice(0, 200).trim();
  const body = String(input.body || "").slice(0, 20000);
  if (!subject || !body.trim()) return { ok: false, sent: 0, failed: 0, skipped: 0, error: "Add a subject and a message." };
  const list = (input.recipients || []).slice(0, 3000);
  const seen = new Set<string>();
  const valid: Recipient[] = [];
  const skipped: Recipient[] = [];
  for (const r of list) {
    const e = String(r.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || seen.has(e)) { skipped.push(r); continue; }
    seen.add(e); valid.push({ ...r, email: e });
  }
  const emails = valid.map((r) => {
    const vars = { NAME: r.name || "friend", FIRST: firstOf(r.name), ...(r.vars || {}) };
    const text = fill(body, vars);
    return { to: r.email, subject: fill(subject, vars), text, html: toHtml(text), replyTo: user.email || undefined };
  });
  const results = await sendEmails(emails);
  const sent = results.filter((x) => x.ok).length;
  const failed = results.length - sent;
  const { data: msg } = await sb.from("messages").insert({
    campaign_id: input.campaignId || null, kind: input.kind || "compose", recipient_type: input.recipientType, channel: "email",
    subject, body, recipients: list.length, sent, failed, sent_by: user.id,
  }).select("id").single();
  if (msg) {
    const rows = [
      ...valid.map((r, i) => ({ message_id: msg.id, name: r.name, email: r.email, phone: r.phone || null, status: results[i]?.ok ? "sent" : "failed", provider_id: results[i]?.id || null, error: results[i]?.error || null })),
      ...skipped.map((r) => ({ message_id: msg.id, name: r.name, email: r.email || null, phone: r.phone || null, status: "skipped", error: "No valid email (or duplicate)" })),
    ];
    for (let i = 0; i < rows.length; i += 500) await sb.from("message_recipients").insert(rows.slice(i, i + 500));
  }
  revalidatePath("/admin/messages");
  return { ok: sent > 0 || !valid.length, sent, failed, skipped: skipped.length, error: failed && !sent ? results.find((x) => !x.ok)?.error : undefined };
}

export async function markRecovery(ids: string[]) {
  const { sb } = await requireAdmin();
  if (ids.length) await sb.from("checkout_starts").update({ recovery_sent_at: new Date().toISOString() }).in("id", ids.slice(0, 1000));
  revalidatePath("/admin/abandoned");
}
