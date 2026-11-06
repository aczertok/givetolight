"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

/** Uploads to the public "photos" bucket under the user's own folder, then submits the URL with the form. */
export default function PhotoField({ userId, current, name = "photo_url", label = "Photo" }: { userId: string; current: string | null; name?: string; label?: string }) {
  const [url, setUrl] = useState(current || "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setErr("Choose a photo (JPG or PNG).");
    if (file.size > 8 * 1024 * 1024) return setErr("That photo is over 8 MB. Choose a smaller one.");
    setErr("");
    setBusy(true);
    const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]+/g, "-")}`;
    const sb = supabaseBrowser();
    const { error } = await sb.storage.from("photos").upload(path, file, { upsert: false, contentType: file.type });
    if (error) setErr("Upload didn't work: " + error.message);
    else setUrl(sb.storage.from("photos").getPublicUrl(path).data.publicUrl);
    setBusy(false);
  }
  return (
    <div className="f" style={{ display: "flex", gap: 12, alignItems: "center" }}>
      {url ? <img src={url} alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} /> : <div className="avatar" style={{ width: 64, height: 64 }}>+</div>}
      <div style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
        <label className="btn ghost sm" style={{ justifySelf: "start" }}>{busy ? "Uploading…" : url ? "Change photo" : "Add a photo"}<input type="file" accept="image/*" hidden onChange={pick} /></label>
        {err && <span className="error">{err}</span>}
      </div>
      <input type="hidden" name={name} value={url} />
    </div>
  );
}
