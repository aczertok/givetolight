import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { emailConfigured } from "@/lib/email";

export const metadata = { title: "Messages" };
const KIND: Record<string, string> = { compose: "Message", donor_list: "Donor list", recovery: "Recovery email" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ id?: string; type?: string }> }) {
  const sp = await searchParams;
  const { sb } = await requireAdmin();
  let q = sb.from("messages").select("id, created_at, kind, recipient_type, channel, subject, recipients, sent, failed, campaign_id").order("created_at", { ascending: false }).limit(200);
  if (sp.type === "donors" || sp.type === "ambassadors") q = q.eq("recipient_type", sp.type);
  const { data: msgs } = await q;
  const { data: camps } = await sb.from("campaigns").select("id, name");
  const cn = new Map((camps || []).map((c) => [c.id, c.name]));
  const open = sp.id ? (msgs || []).find((m) => m.id === sp.id) : null;
  const { data: full } = open ? await sb.from("messages").select("body").eq("id", open.id).single() : { data: null };
  const { data: recips } = open ? await sb.from("message_recipients").select("name, email, phone, status, error").eq("message_id", open.id).order("status").limit(3000) : { data: null };
  return (
    <>
      <div className="toolbar">
        <h1 className="section-h" style={{ margin: 0 }}>Message analytics</h1>
        <div className="acts">
          {[["", "All"], ["donors", "Donors"], ["ambassadors", "Ambassadors"]].map(([v, l]) => <Link key={v} className={`btn sm ${(sp.type || "") === v ? "" : "ghost"}`} href={`/admin/messages${v ? `?type=${v}` : ""}`}>{l}</Link>)}
        </div>
      </div>
      {!emailConfigured() && <p className="note-box">Email sending isn&apos;t connected yet. Add <b>RESEND_API_KEY</b> in Vercel → Settings → Environment Variables, then redeploy.</p>}
      {!msgs?.length ? <div className="donors"><div className="empty">No messages sent yet. Send one from Compare, Ambassador compare or Abandoned.</div></div> : (
        <div className="tw"><table>
          <thead><tr><th>Subject</th><th>Sent</th><th>Type</th><th>Recipients</th><th className="r">Delivered</th><th className="r">Failed</th><th>Campaign</th><th /></tr></thead>
          <tbody>{msgs.map((m) => (
            <tr key={m.id} className={open?.id === m.id ? "cc-sel" : ""}>
              <td><b>{m.subject}</b></td>
              <td className="meta">{new Date(m.created_at).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</td>
              <td>{KIND[m.kind] || m.kind} · {m.channel}</td>
              <td className="num">{m.recipients} {m.recipient_type}</td>
              <td className="r num">{m.sent}</td>
              <td className="r num">{m.failed || "—"}</td>
              <td className="meta">{(m.campaign_id && cn.get(m.campaign_id)) || "—"}</td>
              <td><Link className="btn ghost sm" href={`/admin/messages?id=${m.id}${sp.type ? `&type=${sp.type}` : ""}`}>View details</Link></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      {open && (
        <div className="an-grid" style={{ marginTop: 20 }}>
          <section className="panel"><h2>{open.subject}</h2><div style={{ whiteSpace: "pre-wrap", fontSize: 14 }}>{full?.body}</div><p>Fill-ins like {"{{FIRST}}"} were replaced for each person.</p></section>
          <section className="panel"><h2>Recipients ({recips?.length || 0})</h2>
            <div className="tw"><table><thead><tr><th>Name</th><th>Email</th><th>Status</th></tr></thead><tbody>
              {(recips || []).map((r, i) => <tr key={i}><td>{r.name}</td><td className="meta">{r.email || "—"}</td><td><span className={`pill ${r.status === "sent" ? "ok" : r.status === "failed" ? "wait" : "off"}`} title={r.error || ""}>{r.status}</span></td></tr>)}
            </tbody></table></div>
          </section>
        </div>
      )}
    </>
  );
}
