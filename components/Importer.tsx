"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseCSV, toRows, type ParsedRow } from "@/lib/importParse";
import { importGifts } from "@/app/admin/actions";
import { money } from "@/lib/format";

export default function Importer({ campaigns, totals }: { campaigns: { id: string; name: string; status: string }[]; totals: { campaign_id: string; gifts: number; raised: number }[] }) {
  const router = useRouter();
  const [cid, setCid] = useState(campaigns.find((c) => c.status === "ended")?.id || campaigns[0]?.id || "");
  const [file, setFile] = useState<{ name: string; rows: ParsedRow[]; skipped: number; campaign: string } | null>(null);
  const [replace, setReplace] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const tmap = new Map(totals.map((t) => [t.campaign_id, t]));

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setMsg("");
    if (!/\.csv$/i.test(f.name)) { setMsg("Save the file as CSV first, then choose it again."); return; }
    const r = new FileReader();
    r.onload = () => {
      const { rows, skipped, campaign } = toRows(parseCSV(String(r.result).replace(/^﻿/, "")));
      if (!rows.length) { setMsg("No donations found in that file. Check that it has an amount column."); return; }
      setFile({ name: f.name, rows, skipped, campaign });
      const match = campaigns.find((c) => c.name.toLowerCase() === campaign.toLowerCase());
      if (match) setCid(match.id);
    };
    r.readAsText(f);
    e.target.value = "";
  }

  async function go() {
    if (!file || !cid) return;
    setBusy(true);
    setMsg("");
    let done = 0;
    for (let i = 0; i < file.rows.length; i += 1000) {
      const res = await importGifts(cid, file.rows.slice(i, i + 1000), replace && i === 0);
      if (!res.ok) { setMsg(res.error || "Import stopped."); setBusy(false); return; }
      done += res.count || 0;
    }
    setMsg(`Imported ${done.toLocaleString()} gifts into ${campaigns.find((c) => c.id === cid)?.name}.`);
    setFile(null);
    setBusy(false);
    router.refresh();
  }

  const total = file?.rows.reduce((s, r) => s + r.amount, 0) || 0;
  return (
    <div className="two">
      <div className="panel">
        <h2>1. Choose the file</h2>
        <label className="btn ghost" style={{ justifySelf: "start" }}>Choose a CSV export<input type="file" accept=".csv,text/csv" hidden onChange={pick} /></label>
        {file && (
          <>
            <p className="num"><b>{file.name}</b>: {file.rows.length.toLocaleString()} gifts, {money(total)}{file.skipped ? ` · ${file.skipped} rows skipped (totals or blanks)` : ""}{file.campaign ? ` · campaign in file: “${file.campaign}”` : ""}</p>
            <div className="tw"><table><thead><tr><th>Donor</th><th>Email</th><th className="r">Amount</th><th>Date</th><th>Ambassador</th></tr></thead><tbody>
              {file.rows.slice(0, 5).map((r, i) => <tr key={i}><td>{r.name}</td><td>{r.email || "—"}</td><td className="r num">{money(r.amount, true)}</td><td>{r.date || "—"}</td><td>{r.ambassador || "—"}</td></tr>)}
            </tbody></table></div>
          </>
        )}
        <h2>2. Import into</h2>
        <select className="in" value={cid} onChange={(e) => setCid(e.target.value)} aria-label="Campaign">
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.status}){tmap.get(c.id) ? ` · ${Number(tmap.get(c.id)!.gifts).toLocaleString()} gifts now` : ""}</option>)}
        </select>
        <label className="chk"><input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> Replace gifts imported earlier into this campaign (so a newer export never double-counts)</label>
        {msg && <p role="status" className={msg.startsWith("Imported") ? "" : "error"}>{msg}</p>}
        <button className="btn" style={{ justifySelf: "start" }} disabled={!file || !cid || busy} onClick={go}>{busy ? "Importing…" : file ? `Import ${file.rows.length.toLocaleString()} gifts` : "Import"}</button>
      </div>
      <div className="panel">
        <h2>What&apos;s kept</h2>
        <p>Name, email, phone, amount, date, payment method, ambassador and team. Addresses and other columns are ignored. &quot;Total amount&quot; rows at the bottom of Charidy files are skipped automatically.</p>
      </div>
    </div>
  );
}
