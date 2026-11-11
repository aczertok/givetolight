"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const GROUPS: [string, [string, string][]][] = [
  ["", [["/admin", "Overview"], ["/admin/campaigns", "Campaigns"]]],
  ["Analytics", [["/admin/analytics", "Analytics"], ["/admin/compare", "Campaign compare"], ["/admin/ambassador-compare", "Ambassador compare"], ["/admin/messages", "Messages"]]],
  ["Donations", [["/admin/donations", "All donations"], ["/admin/abandoned", "Abandoned"]]],
  ["People", [["/admin/ambassadors", "Ambassadors"], ["/admin/outreach", "Outreach"], ["/admin/import", "Import"]]],
];
export default function AdminNav() {
  const p = usePathname();
  if (p === "/admin/not-allowed") return null;
  const on = (href: string) => (href === "/admin" ? p === href : p === href || p.startsWith(href + "/"));
  return (
    <nav className="admin-nav an-nav" aria-label="Admin">
      {GROUPS.map(([g, links]) => (
        <div key={g || "main"} className="an-navg">
          {g && <span className="an-navl">{g}</span>}
          {links.map(([href, label]) => <Link key={href} href={href} aria-current={on(href) ? "page" : undefined}>{label}</Link>)}
        </div>
      ))}
    </nav>
  );
}
