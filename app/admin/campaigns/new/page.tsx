import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import CampaignFields from "@/components/CampaignFields";
import { createCampaign } from "../../actions";

export const metadata = { title: "New campaign" };
const ERR: Record<string, string> = { name: "Give the campaign a name.", reserved: "That web address is reserved. Choose another.", taken: "Another campaign already uses that web address.", save: "Couldn't save. Please try again." };

export default async function NewCampaign({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { sb, user } = await requireAdmin();
  const sp = await searchParams;
  const { data } = await sb.from("campaigns").select("slug");
  return (
    <>
      <div className="adm-h"><div><h1>New campaign</h1><p>It starts as a <b>Draft</b> that only you can see. Set it to Live when it&apos;s ready.</p></div><Link className="btn ghost sm" href="/admin/campaigns">Cancel</Link></div>
      <form action={createCampaign} style={{ maxWidth: 860 }}>
        {sp.error && <p className="error" style={{ marginBottom: 12 }}>{ERR[sp.error] || ERR.save}</p>}
        <CampaignFields userId={user.id} taken={(data || []).map((c) => c.slug)} />
        <div className="cf-save"><button className="btn">Create campaign</button><span className="meta">You can change everything later, including the web address.</span></div>
      </form>
    </>
  );
}
