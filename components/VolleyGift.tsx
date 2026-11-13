"use client";
import Link from "next/link";
import { useState } from "react";
import { money } from "@/lib/format";

export default function VolleyGift({ slug, presets, matchMultiplier, matchingAvailable }: {
  slug: string; presets: number[]; matchMultiplier: number; matchingAvailable: boolean;
}) {
  const validPresets = [...new Set(presets.filter(n => Number.isFinite(n) && n >= 1 && n <= 250000))];
  const choices = validPresets.length >= 3 ? validPresets.slice(0, 4) : [72, 180, 360, 1000];
  const [chosen, setChosen] = useState(choices[Math.min(1, choices.length - 1)]);
  const [custom, setCustom] = useState("");
  const raw = custom !== "" ? Number(custom) : chosen;
  const valid = Number.isFinite(raw) && raw >= 1 && raw <= 250000;
  const amount = valid ? Math.round(raw * 100) / 100 : 0;
  const checkout = `/${slug}/donate?amount=${encodeURIComponent(String(amount))}&plan=once`;

  return <>
    <section className="vb-gift" id="donate" aria-label="Give to this campaign">
      <div className="vb-kicker">MAKE A DONATION</div>
      <h2>Support the Lighthouse</h2>
      <p className="vb-gift-caption">Choose your amount. Your gift helps fund the Lighthouse.</p>
      <div className="vb-amounts" role="group" aria-label="Donation amount">
        {choices.map(n => <button type="button" key={n} aria-pressed={custom === "" && chosen === n}
          onClick={() => { setChosen(n); setCustom(""); }}>{money(n)}</button>)}
      </div>
      <label className="vb-custom">
        <span aria-hidden="true">$</span>
        <span className="sr-only">Custom donation amount</span>
        <input type="number" min="1" max="250000" step="0.01" inputMode="decimal"
          value={custom} onChange={e => setCustom(e.target.value)} placeholder="Other amount"/>
      </label>
      {matchingAvailable && <p className="vb-match-note">Eligible donations may be matched up to {matchMultiplier}×, while matching funds remain.</p>}
      {valid ? <Link href={checkout} className="vb-donate-button">DONATE {money(amount)} NOW <span aria-hidden="true">→</span></Link>
        : <p className="vb-gift-error" role="alert">Choose an amount between $1 and $250,000.</p>}
      <div className="vb-secure"><span aria-hidden="true">●</span> Secure checkout · Card · Digital wallet · Bank · DAF</div>
    </section>
    <div className="vb-mobile-sticky">
      {valid ? <Link href={checkout} className="vb-mobile-donate">DONATE {money(amount)} NOW <span aria-hidden="true">→</span></Link>
      : <a href="#donate" className="vb-mobile-donate">CHOOSE AN AMOUNT <span aria-hidden="true">↑</span></a>}
    </div>
  </>;
}
