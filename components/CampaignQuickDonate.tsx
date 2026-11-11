"use client";

import Link from "next/link";
import { useState } from "react";
import { money } from "@/lib/format";

type Props = {
  slug: string;
  presets: number[];
  matchMultiplier: number;
  matchingAvailable: boolean;
};

export default function CampaignQuickDonate({ slug, presets, matchMultiplier, matchingAvailable }: Props) {
  const validPresets = [...new Set(presets.filter((n) => Number.isFinite(n) && n >= 1 && n <= 250000))];
  const choices = (validPresets.length ? validPresets : [72, 180, 360, 1000]).slice(0, 4);
  const [selected, setSelected] = useState(choices[Math.min(1, choices.length - 1)]);
  const [custom, setCustom] = useState("");
  const [plan, setPlan] = useState<"once" | "monthly">("once");
  const rawAmount = custom !== "" ? Number(custom) : selected;
  const valid = Number.isFinite(rawAmount) && rawAmount >= 1 && rawAmount <= 250000;
  const amount = valid ? Math.round(rawAmount * 100) / 100 : 0;
  const href = `/${slug}/donate?amount=${encodeURIComponent(String(amount))}&plan=${plan}`;

  return (
    <div className="gl-quick-wrap">
      <aside className="gl-quick-donate" id="give" aria-label="Choose your donation">
        <div className="gl-quick-kicker">MAKE A DIFFERENCE TODAY</div>
        <h2>Make your gift</h2>
        <p className="gl-quick-intro">A few clicks can make a real difference.</p>
        <div className="gl-quick-frequency" role="group" aria-label="Donation frequency">
          <button type="button" aria-pressed={plan === "once"} onClick={() => setPlan("once")}>One-time</button>
          <button type="button" aria-pressed={plan === "monthly"} onClick={() => setPlan("monthly")}>Monthly</button>
        </div>
        <div className="gl-quick-label">Select an amount</div>
        <div className="gl-quick-amounts">
          {choices.map((n) => (
            <button type="button" key={n} aria-pressed={custom === "" && selected === n}
              onClick={() => { setSelected(n); setCustom(""); }}>
              {money(n)}
            </button>
          ))}
        </div>
        <label className="gl-custom-wrap">
          <span className="sr-only">Custom donation amount</span>
          <span aria-hidden="true">$</span>
          <input type="number" min="1" max="250000" step="0.01" inputMode="decimal"
            placeholder="Other amount" value={custom} onChange={(e) => setCustom(e.target.value)} />
        </label>
        {matchingAvailable && plan === "once" && (
          <div className="gl-quick-match"><span aria-hidden="true">✦</span><span>Eligible gifts may be matched up to {matchMultiplier}×, subject to available matching funds.</span></div>
        )}
        {valid ? (
          <Link className="gl-quick-submit" href={href}>
            Donate {money(amount)}{plan === "monthly" ? " monthly" : " now"} <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <div className="gl-quick-invalid" role="alert">Choose an amount from $1 to $250,000.</div>
        )}
        <div className="gl-quick-trust">Secure checkout <span aria-hidden="true">·</span> Card, digital wallet, bank or DAF</div>
      </aside>
      <div className="gl-mobile-donate-bar">
        <div className="gl-mobile-selected"><strong>{valid ? money(amount) : "Select an amount"}</strong><span>{plan === "monthly" ? "Monthly gift" : "One-time gift"}</span></div>
        {valid ? <Link className="gl-mobile-donate-button" href={href}>Donate {money(amount)} <span aria-hidden="true">→</span></Link> : <a className="gl-mobile-donate-button" href="#give">Choose amount</a>}
      </div>
    </div>
  );
}
