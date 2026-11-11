import PhotoField from "@/components/PhotoField";
import { SITE_HOST } from "@/lib/format";
import NameSlug from "@/components/NameSlug";

type C = Record<string, unknown>;
const dt = (v: unknown) => (typeof v === "string" && v ? new Date(v).toISOString().slice(0, 16) : "");

export default function CampaignFields({ c, userId, taken = [] }: { c?: C; userId: string; taken?: string[] }) {
  const v = (k: string) => (c?.[k] ?? "") as string | number;
  return (
    <div className="cf">
      <section className="cf-sec"><h3><span>1</span>Name and web address</h3><div className="form-grid">
        <NameSlug name={String(v("name"))} slug={String(v("slug"))} host={SITE_HOST} taken={taken} />
        <label className="f">Type
          <select className="in" name="kind" defaultValue={String(v("kind") || "volleyball")}><option value="volleyball">Volleyball</option><option value="hike">Hike</option><option value="other">Other</option></select>
        </label>
        <label className="f">Year<input className="in num" name="year" type="number" defaultValue={v("year") || new Date().getFullYear() + 1} /></label>
      </div></section>

      <section className="cf-sec"><h3><span>2</span>Goal and matching</h3><div className="form-grid">
        <label className="f">Goal ($)<input className="in num" name="goal" type="number" min="0" defaultValue={v("goal")} placeholder="200000" /></label>
        <label className="f">Match
          <select className="in" name="match_multiplier" defaultValue={String(v("match_multiplier") || 1)}><option value="1">No match</option><option value="1.5">1.5× (50% match)</option><option value="2">2× (doubled)</option><option value="3">3× (tripled)</option><option value="4">4×</option><option value="5">5×</option></select>
        </label>
        <label className="f">Total pledged by matchers ($)<input className="in num" name="match_cap" type="number" min="0" defaultValue={v("match_cap")} placeholder="Leave blank for no cap" /></label>
        <label className="f">Match banner text<input className="in" name="match_note" defaultValue={v("match_note")} placeholder="Every gift doubled!" maxLength={140} /></label>
      </div></section>

      <section className="cf-sec"><h3><span>3</span>Dates and status</h3><div className="form-grid">
        <label className="f">Starts<input className="in" name="starts_at" type="datetime-local" defaultValue={dt(c?.starts_at)} /></label>
        <label className="f">Ends (shows a countdown)<input className="in" name="ends_at" type="datetime-local" defaultValue={dt(c?.ends_at)} /></label>
        <label className="f full">Status
          <select className="in" name="status" defaultValue={String(v("status") || "draft")}>
            <option value="draft">Draft: only you can see it while you set it up</option>
            <option value="live">Live: the page is public and taking donations</option>
            <option value="ended">Ended: page stays up, no new donations</option>
          </select>
        </label>
      </div></section>

      <section className="cf-sec"><h3><span>4</span>Campaign page</h3><div className="form-grid">
        <label className="f full">Tagline (one line under the title)<input className="in" name="tagline" defaultValue={v("tagline")} maxLength={200} placeholder="Join us to keep the lights on for the girls of Monsey" /></label>
        <label className="f full">Story (leave a blank line between paragraphs)<textarea className="in" name="story" rows={6} defaultValue={v("story")} /></label>
        <div className="full"><PhotoField userId={userId} current={(c?.cover_url as string) || null} name="cover_url" label="Cover photo (wide)" /></div>
        <label className="f full">Suggested amounts on the donate page<input className="in num" name="preset_amounts" defaultValue={Array.isArray(c?.preset_amounts) ? (c!.preset_amounts as number[]).join(", ") : "36, 180, 360, 1000, 1800"} /></label>
      </div></section>

      <section className="cf-sec"><h3><span>5</span>Settings</h3><div style={{ display: "grid", gap: 10 }}>
        <label className="chk"><input type="checkbox" name="show_on_home" defaultChecked={c ? Boolean(c.show_on_home) : true} /> Show this campaign on the home page</label>
        <label className="chk"><input type="checkbox" name="ambassador_approval" defaultChecked={c ? Boolean(c.ambassador_approval) : true} /> New ambassadors need my approval before their page goes live</label>
      </div></section>
    </div>
  );
}
