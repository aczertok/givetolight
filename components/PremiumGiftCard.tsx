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

export default function PremiumGiftCard({ slug, presets, matchMultiplier, matchingAvailable }: Props) {
  const amounts = [...new Set(presets.filter((n) => Number.isFinite(n) && n >= 1 && n <= 250000))].slice(0, 4);
  const suggestions = amounts.length >= 3 ? amounts : [72, 180, 360, 1000];
  const [selected, setSelected] = useState(suggestions[1] ?? suggestions[0]);
  const [custom, setCustom] = useState("");
  const [frequency, setFrequency] = useState<"once" | "monthly">("once");

  const raw = custom === "" ? selected : Number(custom);
  const valid = Number.isFinite(raw) && raw >= 1 && raw <= 250000;
  const amount = valid ? Math.round(raw * 100) / 100 : 0;
  const url = `/${slug}/donate?amount=${encodeURIComponent(String(amount))}&plan=${frequency}`;
  const canMatch = matchingAvailable && frequency === "once";

  return (
    <>
      <aside className="pv-gift" id="donate" aria-label="Make a donation">
        <div className="pv-gift-topline"><span className="pv-gift-spark" aria-hidden="true">✦</span><span>MAKE YOUR IMPACT</span></div>
        <h2>Be the reason<br/><em>someone smiles.</em></h2>
        <p className="pv-gift-helper">Choose your gift and continue to secure checkout.</p>
        <div className="pv-frequency" role="group" aria-label="Gift frequency">
          <button type="button" aria-pressed={frequency === "once"} onClick={() => setFrequency("once")}>Give once</button>
          <button type="button" aria-pressed={frequency === "monthly"} onClick={() => setFrequency("monthly")}>Give monthly</button>
        </div>
        <div className="pv-gift-label">Choose an amount</div>
        <div className="pv-amounts">
          {suggestions.map((n) =>
            <button type="button" key={n} aria-pressed={custom === "" && selected === n}
              onClick={() => { setSelected(n); setCustom(""); }}>{money(n)}</button>
          )}
        </div>
        <label className="pv-custom">
          <span aria-hidden="true">$</span><span className="sr-only">Custom gift amount</span>
          <input type="number" min="1" max="250000" inputMode="decimal" step="0.01"
            value={custom} onChange={e => setCustom(e.target.value)}
            placeholder="Enter another amount" aria-label="Custom gift amount"/>
        </label>
        {canMatch && (
          <p className="pv-match-hint"><span aria-hidden="true">✳</span> Eligible gifts may be matched up to {matchMultiplier}×, while matching funds remain.</p>
        )}
        {valid ?
          <Link href={url} className="pv-give-button">DONATE {money(amount)} <span aria-hidden="true">→</span></Link> :
          <div className="pv-gift-error" role="alert">Enter an amount between $1 and $250,000.</div>
        }
        <p className="pv-secure"><span aria-hidden="true">🔒</span> Secure giving · Card · Digital wallet · Bank · DAF</p>
      </aside>
      <div className="pv-mobile-bar" aria-label="Continue to donation checkout">
        <div className="pv-mobile-sum"><strong>{valid ? money(amount) : "Your gift"}</strong><span>{frequency === "monthly" ? "Monthly" : "One-time"}</span></div>
        {valid ?
          <Link href={url} className="pv-mobile-button">Donate now <span aria-hidden="true">→</span></Link> :
          <a href="#donate" className="pv-mobile-button">Choose amount <span aria-hidden="true">↑</span></a>}
      </div>
    </>
  );
}
