"use client";
import { useState } from "react";

const RESERVED = new Set(["admin", "ambassador", "login", "auth", "api", "thank-you", "privacy", "terms", "about", "account", "donate", "team"]);
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export default function NameSlug({ name: n0, slug: s0, host, taken }: { name: string; slug: string; host: string; taken: string[] }) {
  const [name, setName] = useState(n0);
  const [slug, setSlug] = useState(s0);
  const [touched, setTouched] = useState(Boolean(s0));
  const s = touched ? slug : slugify(name);
  const problem = !s ? "" : s.length < 2 ? "Use at least 2 letters or numbers." : RESERVED.has(s) ? "That address is reserved. Pick another." : taken.includes(s) && s !== s0 ? "Another campaign already uses this address." : !/^[a-z0-9][a-z0-9-]{1,60}$/.test(s) ? "Only lowercase letters, numbers and dashes." : "";
  return (
    <>
      <label className="f full">Campaign name<input className="in" name="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Volleyball Tournament 2027" /></label>
      <div className="f full">
        <label htmlFor="slug">Web address</label>
        <div className={`slug-box${problem ? " bad" : ""}`}>
          <span className="slug-host">{host}/</span>
          <input id="slug" className="slug-in" name="slug" value={s} onChange={(e) => { setTouched(true); setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")); }} placeholder="volley2027" required aria-describedby="slug-help" />
        </div>
        <span id="slug-help" className={problem ? "error" : "meta"} style={{ fontWeight: 400 }}>{problem || (s ? <>Your campaign page will be <b>https://{host}/{s}</b>. Ambassadors get <b>{host}/{s}/their-name</b>.</> : "Short and easy to say, like volley2027 or hike2027.")}</span>
      </div>
    </>
  );
}
