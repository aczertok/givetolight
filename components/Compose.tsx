"use client";
import { useState, useTransition } from "react";
import { sendMessage, type Recipient } from "@/app/admin/messages/actions";

const first = (n: string) => { const w = (n || "").trim().split(/\s+/); return w.length > 1 ? w.slice(0, -1).join(" ") : w[0] || "friend"; };
const fill = (t: string, v: Record<string, string>) => t.replace(/\{\{\s*([A-Z_]+)\s*\}\}/gi, (_, k: string) => v[k.toUpperCase()] ?? "");

export default function Compose({ recipients, recipientType, campaignId, kind = "compose", subject: s0, body: b0, tags, onClose, onSent }: {
  recipients: Recipient[]; recipientType: "donors" | "ambassadors"; campaignId?: string | null; kind?: "compose" | "donor_list" | "recovery";
  subject: string; body: string; tags: [string, string][]; onClose: () => void; onSent?: (n: number) => void;
}) {
  const [subject, setSubject] = useState(s0);
  const [body, setBody] = useState(b0);
  const [mode, setMode] = useState<"email" | "text">("email");
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string>("");
  const [err, setErr] = useState("");
  const withEmail = recipients.filter((r) => /@/.test(r.email || ""));
  const withPhone = recipients.filter((r) => r.phone);
  const sample = recipients[0];
  const vars = (r?: Recipient) => ({ NAME: r?.name || "friend", FIRST: first(r?.name || ""), ...(r?.vars || {}) });
  const insert = (t: string) => setBody((b) => b + (b && !b.endsWith(" ") && !b.endsWith("\n") ? " " : "") + `{{${t}}}`);
  const send = () => {
    setErr(""); setResult("");
    start(async () => {
      const r = await sendMessage({ campaignId, kind, recipientType, subject, body, recipients });
      if (!r.ok) { setErr(r.error || "Couldn't send."); return; }
      setResult(`Sent to ${r.sent}${r.failed ? `, ${r.failed} failed` : ""}${r.skipped ? `, ${r.skipped} skipped (no email)` : ""}.`);
      onSent?.(r.sent);
    });
  };
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Compose message" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cmp">
        <div className="toolbar" style={{ margin: 0 }}>
          <h2 style={{ margin: 0 }}>Compose message</h2>
          <button type="button" className="btn ghost sm" onClick={onClose}>Close</button>
        </div>
        <p className="meta" style={{ margin: 0 }}>{recipients.length} {recipientType} selected · {withEmail.length} with email · {withPhone.length} with phone</p>
        <div className="seg" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <button type="button" className="opt" aria-pressed={mode === "email"} onClick={() => setMode("email")}>Email (sends now)</button>
          <button type="button" className="opt" aria-pressed={mode === "text"} onClick={() => setMode("text")}>Text message (tap to send)</button>
        </div>
        {mode === "email" && <label className="f">Subject<input className="in" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} /></label>}
        <label className="f">Message<textarea className="in" rows={9} value={body} onChange={(e) => setBody(e.target.value)} /></label>
        <div className="cmp-tags"><span className="meta">Fill-ins:</span>{tags.map(([t, l]) => <button key={t} type="button" className="an-chip" onClick={() => insert(t)} title={l}>{`{{${t}}}`}</button>)}</div>
        {sample && (
          <details className="cmp-prev" open>
            <summary className="meta">Preview for {sample.name || sample.email}</summary>
            {mode === "email" && <b>{fill(subject, vars(sample))}</b>}
            <div style={{ whiteSpace: "pre-wrap" }}>{fill(body, vars(sample))}</div>
          </details>
        )}
        {mode === "email" ? (
          <>
            {err && <p className="error" role="alert">{err}</p>}
            {result ? <p className="note-box" role="status">✓ {result} You&apos;ll see it under Admin → Messages.</p> : (
              <button type="button" className="btn" disabled={pending || !withEmail.length} onClick={send}>{pending ? "Sending…" : `Send email to ${withEmail.length}`}</button>
            )}
            <p className="meta" style={{ margin: 0 }}>From Give to Light &lt;noreply@givetolight.com&gt;. Replies go to your email.</p>
          </>
        ) : (
          <div className="cmp-sms">
            <p className="meta" style={{ margin: 0 }}>Your site can&apos;t send texts by itself yet, so each one opens on your phone ready to send. Open this page on your phone and tap each name.</p>
            <div className="tw"><table><tbody>
              {withPhone.slice(0, 300).map((r, i) => (
                <tr key={i}><td>{r.name}</td><td className="num">{r.phone}</td><td><a className="btn sm" href={`sms:${r.phone}?&body=${encodeURIComponent(fill(body, vars(r)))}`}>Text</a></td></tr>
              ))}
            </tbody></table></div>
            {!withPhone.length && <p className="meta">None of the selected people have a phone number.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
