import { timeAgo } from "@/lib/format";
import { WithMatch } from "@/components/Bits";
import type { PublicDonation } from "@/lib/data";

export default function DonorList({ donations, factor, names, limit }: { donations: PublicDonation[]; factor: number; names?: Map<string, string>; limit?: number }) {
  const list = limit ? donations.slice(0, limit) : donations;
  if (!list.length) return <div className="donors"><div className="empty">No donations yet. Be the first.</div></div>;
  return (
    <div className="donors">
      {list.map((d) => {
        const forName = d.ambassador_id && names ? names.get(d.ambassador_id) : null;
        const note = [d.dedication, d.message].filter(Boolean).join(" · ");
        return (
          <div className="donor" key={d.id}>
            <div>
              <b>{d.display_name}</b>{" "}
              <span className="meta">
                · {timeAgo(d.created_at)}
                {forName ? ` · for ${forName}` : ""}
                {d.plan === "monthly" ? " · monthly" : d.plan?.startsWith("installments:") ? ` · ${d.plan.split(":")[1]} payments` : ""}
              </span>
            </div>
            <div className="amt num"><WithMatch amount={d.amount} factor={factor} /></div>
            {note && <div className="note">“{note}”</div>}
          </div>
        );
      })}
    </div>
  );
}
