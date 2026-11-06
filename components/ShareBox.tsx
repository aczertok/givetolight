"use client";
import { useState } from "react";

export default function ShareBox({ url, message }: { url: string; message?: string }) {
  const [done, setDone] = useState("");
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); setDone(what + " copied"); } catch { setDone("Select the text and copy it"); }
    setTimeout(() => setDone(""), 2500);
  };
  const text = message ? `${message} ${url}` : url;
  return (
    <div className="panel">
      <h2>Share</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <input className="in" readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Page link" />
        <button className="btn ghost" onClick={() => copy(url, "Link")}>Copy</button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <a className="btn ghost sm" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a>
        <a className="btn ghost sm" href={`sms:?&body=${encodeURIComponent(text)}`}>Text message</a>
        <a className="btn ghost sm" href={`mailto:?subject=${encodeURIComponent("Please support The Lighthouse Project")}&body=${encodeURIComponent(text)}`}>Email</a>
        {message && <button className="btn ghost sm" onClick={() => copy(text, "Message")}>Copy message</button>}
      </div>
      {done && <p role="status">{done}</p>}
    </div>
  );
}
