import { requireAdmin } from "@/lib/admin";
import CampaignFields from "@/components/CampaignFields";
import { createCampaign } from "../../actions";

const ERR: Record<string, string> = { name: "Give the campaign a name.", reserved: "That web address is reserved. Choose another.", taken: "Another campaign already uses that web address.", save: "Couldn't save. Please try again." };

export default async function NewCampaign({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { user } = await requireAdmin();
  const sp = await searchParams;
  return (
    <form className="panel" action={createCampaign} style={{ maxWidth: 860 }}>
      <h2>New campaign</h2>
      {sp.error && <p className="error">{ERR[sp.error] || ERR.save}</p>}
      <CampaignFields userId={user.id} />
      <button className="btn" style={{ justifySelf: "start" }}>Create campaign</button>
    </form>
  );
}
