import { NextResponse } from "next/server";
import { currentUser, isAdmin, supabaseServer } from "@/lib/supabase/server";
import { allRows, type Gift, METHOD_LABEL } from "@/lib/admin";

export async function GET(req: Request) {
  if (!(await currentUser()) || !(await isAdmin())) return NextResponse.json({ error: "not allowed" }, { status: 403 });
  const url = new URL(req.url);
  const cid = url.searchParams.get("c") || "";
  const status = url.searchParams.get("s") || "succeeded";
  const sb = await supabaseServer();
  const { data: c } = await sb.from("campaigns").select("name, slug").eq("id", cid).maybeSingle();
  const gifts = await allRows<Gift>((a, b) => sb.from("donations").select("*").eq("campaign_id", cid).order("created_at", { ascending: false }).range(a, b));
  const { data: ambs } = await sb.from("ambassadors").select("id, name").eq("campaign_id", cid);
  const { data: teams } = await sb.from("teams").select("id, name").eq("campaign_id", cid);
  const an = new Map((ambs || []).map((a) => [a.id, a.name]));
  const tn = new Map((teams || []).map((t) => [t.id, t.name]));
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = gifts
    .filter((d) => status === "all" || d.status === status)
    .map((d) => [d.created_at.slice(0, 10), d.donor_name, d.donor_email, d.donor_phone, d.amount, d.fee_covered, METHOD_LABEL[d.method || ""] || d.method, d.method_detail, d.plan || "one-time", an.get(d.ambassador_id || "") || d.ambassador_name, tn.get(d.team_id || "") || d.team_name, d.anonymous ? "yes" : "", d.dedication, d.message, d.status, d.provider].map(q).join(","));
  const csv = ["Date,Donor,Email,Phone,Amount,Fee covered,Method,Detail,Plan,Ambassador,Team,Anonymous,Dedication,Message,Status,Source", ...rows].join("\n");
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${c?.slug || "donations"}-donations.csv"` } });
}
