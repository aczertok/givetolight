import { redirect } from "next/navigation";

// givetolight.com/volley2027/join → the ambassador sign-up for that campaign
export default async function Join({ params }: { params: Promise<{ campaign: string }> }) {
  const { campaign } = await params;
  redirect(`/ambassador?join=${encodeURIComponent(campaign.toLowerCase())}`);
}
