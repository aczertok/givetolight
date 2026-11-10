import PhotoField from "@/components/PhotoField";
import { SITE_HOST } from "@/lib/format";

type C = Record<string, unknown>;
const dt = (v: unknown) => (typeof v === "string" && v ? new Date(v).toISOString().slice(0, 16) : "");

export default function CampaignFields({ c, userId }: { c?: C; userId: string }) {
  const v = (k: string) => (c?.[k] ?? "") as string | number;
  return (
    <div className="form-grid">
      <label className="f">Campaign name<input className="in" name="name" required defaultValue={v("name")} placeholder="Hike for Light 2027" /></label>
      <label className="f">Web address: {SITE_HOST}/<input className="in" name="slug" defaultValue={v("slug")} placeholder="volley2027" pattern="[a-z0-9][a-z0-9\-]{1,60}" title="Lowercase letters, numbers and dashes" /></label>
      <label className="f">Type
        <select className="in" name="kind" defaultValue={String(v("kind") || "hike")}><option value="hike">Hike</option><option value="volleyball">Volleyball</option><option value="other">Other</option></select>
      </label>
      <label className="f">Year<input className="in num" name="year" type="number" defaultValue={v("year") || new Date().getFullYear()} /></label>
      <label className="f full">Tagline<input className="in" name="tagline" defaultValue={v("tagline")} maxLength={200} /></label>
      <label className="f full">Story (blank line between paragraphs)<textarea className="in" name="story" rows={6} defaultValue={v("story")} /></label>
      <div className="full"><PhotoField userId={userId} current={(c?.cover_url as string) || null} name="cover_url" label="Cover photo (wide)" /></div>
      <label className="f">Goal ($)<input className="in num" name="goal" type="number" min="0" defaultValue={v("goal")} /></label>
      <label className="f">Suggested amounts<input className="in num" name="preset_amounts" defaultValue={Array.isArray(c?.preset_amounts) ? (c!.preset_amounts as number[]).join(", ") : "36, 180, 360, 1000, 1800"} /></label>
      <label className="f">Match (1 = no match, 2 = doubled)<input className="in num" name="match_multiplier" type="number" step="0.5" min="1" defaultValue={v("match_multiplier") || 1} /></label>
      <label className="f">Total pledged by matchers ($, blank = no cap)<input className="in num" name="match_cap" type="number" min="0" defaultValue={v("match_cap")} /></label>
      <label className="f full">Match banner text<input className="in" name="match_note" defaultValue={v("match_note")} placeholder="Our matchers are doubling every gift" maxLength={140} /></label>
      <label className="f">Starts<input className="in" name="starts_at" type="datetime-local" defaultValue={dt(c?.starts_at)} /></label>
      <label className="f">Ends (countdown)<input className="in" name="ends_at" type="datetime-local" defaultValue={dt(c?.ends_at)} /></label>
      <label className="f">Status
        <select className="in" name="status" defaultValue={String(v("status") || "draft")}>
          <option value="draft">Draft: only staff can see it</option>
          <option value="live">Live: taking donations</option>
          <option value="ended">Ended: visible, no new donations</option>
        </select>
      </label>
      <div style={{ display: "grid", gap: 8, alignContent: "end" }}>
        <label className="chk"><input type="checkbox" name="show_on_home" defaultChecked={c ? Boolean(c.show_on_home) : true} /> Show on the home page</label>
        <label className="chk"><input type="checkbox" name="ambassador_approval" defaultChecked={c ? Boolean(c.ambassador_approval) : true} /> New ambassadors need my approval</label>
      </div>
    </div>
  );
}
