"use client";
import type { CampaignLite } from "@/lib/loadGifts";

export const fmt = (n: number, c = false) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: c ? 2 : 0, minimumFractionDigits: c ? 2 : 0 }).format(n || 0);
export const num = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n || 0));
export const pct = (n: number) => (isFinite(n) ? Math.round(n * 100) + "%" : "—");

export function csvDownload(name: string, head: string[], rows: (string | number | null | undefined)[][]) {
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + [head, ...rows].map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv" }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function Pager({ page, per, total, set, setPer }: { page: number; per: number; total: number; set: (n: number) => void; setPer?: (n: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / per));
  return (
    <div className="cd-pager">
      {setPer && <label className="meta">Results per page <select className="in" value={per} onChange={(e) => setPer(Number(e.target.value))} style={{ padding: "4px 8px" }}>{[30, 100, 200, 500].map((n) => <option key={n}>{n}</option>)}</select></label>}
      <span className="meta num">{total ? `${page * per + 1}–${Math.min(total, page * per + per)} of ${num(total)}` : "0"}</span>
      <button type="button" className="btn ghost sm" disabled={!page} onClick={() => set(page - 1)}>← Prev</button>
      <button type="button" className="btn ghost sm" disabled={page >= pages - 1} onClick={() => set(page + 1)}>Next →</button>
    </div>
  );
}

export function PickPair({ campaigns, prev, next, onChange }: { campaigns: CampaignLite[]; prev: string; next: string; onChange: (p: string, n: string) => void }) {
  return (
    <div className="an-filters cc-pick">
      <label className="meta">Previous campaign
        <select className="in" value={prev} onChange={(e) => onChange(e.target.value, next)}>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </label>
      <span className="cc-to">to</span>
      <label className="meta">New campaign
        <select className="in" value={next} onChange={(e) => onChange(prev, e.target.value)}>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </label>
    </div>
  );
}
