"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: [string, string][] = [
  ["/admin", "Overview"],
  ["/admin/campaigns", "Campaigns"],
  ["/admin/donations", "Donations"],
  ["/admin/ambassadors", "Ambassadors"],
  ["/admin/outreach", "Outreach"],
  ["/admin/import", "Import"],
];
export default function AdminNav() {
  const p = usePathname();
  if (p === "/admin/not-allowed") return null;
  return (
    <nav className="admin-nav" aria-label="Admin">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={(href === "/admin" ? p === href : p.startsWith(href)) ? "page" : undefined}>{label}</Link>
      ))}
    </nav>
  );
}
