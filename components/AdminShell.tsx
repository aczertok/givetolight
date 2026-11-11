"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const I = {
  home: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z",
  flag: "M5 21V4m0 0h11l-2 4 2 4H5",
  plus: "M12 5v14M5 12h14",
  chart: "M4 20V10m6 10V4m6 16v-7m4 7H2",
  scale: "M12 3v18M5 7h14M5 7l-3 7h6zm14 0-3 7h6z",
  people: "M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7 8v-1a3 3 0 0 0-2-2.8M17 5.2a3 3 0 0 1 0 5.6",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  gift: "M4 11h16v10H4zM2 7h20v4H2zm10 0v14M12 7S10 3 7.5 4 9 7 12 7zm0 0s2-4 4.5-3S15 7 12 7z",
  life: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5.6 5.6l3.6 3.6m5.6 5.6 3.6 3.6m0-12.8-3.6 3.6m-5.6 5.6-3.6 3.6",
  star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  upload: "M12 16V4m0 0-4 4m4-4 4 4M4 20h16",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0",
  out: "M15 4h4v16h-4M10 17l5-5-5-5m5 5H3",
};
type Item = [string, string, keyof typeof I];
const GROUPS: [string, Item[]][] = [
  ["", [["/admin", "Home", "home"]]],
  ["Campaigns", [["/admin/campaigns", "All campaigns", "flag"], ["/admin/campaigns/new", "New campaign", "plus"]]],
  ["Analytics", [["/admin/analytics", "Donation analytics", "chart"], ["/admin/compare", "Campaign compare", "scale"], ["/admin/ambassador-compare", "Ambassador compare", "people"], ["/admin/messages", "Message analytics", "mail"]]],
  ["Donations", [["/admin/donations", "All donations", "gift"], ["/admin/abandoned", "Abandoned", "life"], ["/admin/import", "Import past data", "upload"]]],
  ["People", [["/admin/ambassadors", "Ambassadors", "star"], ["/admin/outreach", "Text outreach", "phone"]]],
];
const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const p = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [p]);
  const on = (h: string) => (h === "/admin" ? p === h : h === "/admin/campaigns" ? p === h || (/^\/admin\/campaigns\/[^/]+/.test(p) && !p.endsWith("/new")) : p === h || p.startsWith(h + "/"));
  if (p === "/admin/not-allowed") return <main className="page wrap">{children}</main>;
  return (
    <div className="adm">
      <aside className={`adm-side${open ? " open" : ""}`} aria-label="Admin menu">
        <Link href="/admin" className="adm-brand"><span>Give to Light</span><small>Admin</small></Link>
        <nav>
          {GROUPS.map(([g, items]) => (
            <div key={g || "top"} className="adm-group">
              {g && <div className="adm-gl">{g}</div>}
              {items.map(([h, l, ic]) => <Link key={h} href={h} aria-current={on(h) ? "page" : undefined}><Icon d={I[ic]} />{l}</Link>)}
            </div>
          ))}
        </nav>
        <div className="adm-foot">
          <Link href="/"><Icon d={I.globe} />View website</Link>
          <Link href="/account"><Icon d={I.user} />My account</Link>
          <a href="/auth/logout"><Icon d={I.out} />Log out</a>
        </div>
      </aside>
      {open && <div className="adm-scrim" onClick={() => setOpen(false)} />}
      <div className="adm-main">
        <div className="adm-top">
          <button type="button" className="adm-menu" onClick={() => setOpen(true)} aria-label="Open menu"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg></button>
          <b>Give to Light</b>
          <Link className="btn sm" href="/admin/campaigns/new">+ New</Link>
        </div>
        <div className="adm-body">{children}</div>
      </div>
    </div>
  );
}
