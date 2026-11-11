// Sends email through Resend (resend.com). Needs RESEND_API_KEY in Vercel's settings.
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);
const FROM = () => process.env.EMAIL_FROM || "Give to Light <noreply@givetolight.com>";

export type OutEmail = { to: string; subject: string; text: string; html: string; replyTo?: string };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
export function toHtml(text: string) {
  const body = esc(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#a2295a">$1</a>')
    .replace(/\n/g, "<br>");
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.55;color:#14213d;max-width:560px">${body}</div>`;
}

/** Fill {{NAME}}-style tags. Unknown tags become empty. */
export function fill(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{\s*([A-Z_]+)\s*\}\}/gi, (_, k: string) => vars[k.toUpperCase()] ?? "");
}

/** Sends up to 100 per request. Returns one result per email, in order. */
export async function sendEmails(list: OutEmail[]): Promise<{ ok: boolean; id?: string; error?: string }[]> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return list.map(() => ({ ok: false, error: "Email isn't connected (RESEND_API_KEY missing)." }));
  const out: { ok: boolean; id?: string; error?: string }[] = [];
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    try {
      const res = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(chunk.map((m) => ({ from: FROM(), to: [m.to], subject: m.subject, text: m.text, html: m.html, ...(m.replyTo ? { reply_to: m.replyTo } : {}) }))),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { chunk.forEach(() => out.push({ ok: false, error: (j && (j.message || j.name)) || `HTTP ${res.status}` })); continue; }
      const ids: { id: string }[] = j.data || [];
      chunk.forEach((_, k) => out.push({ ok: true, id: ids[k]?.id }));
    } catch (e) {
      chunk.forEach(() => out.push({ ok: false, error: String(e).slice(0, 200) }));
    }
  }
  return out;
}
