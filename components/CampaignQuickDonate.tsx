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
  const choices = presets.filter((n) => Number.isFinite(n) && n >= 1).slice(0, 6);
  const [selected, setSelected] = useState(choices[1] ?? choices[0] ?? 180);
  const [custom, setCustom] = useState("");
  const [plan, setPlan] = useState<"once" | "monthly">("once");
  const amount = custom !== "" ? Number(custom) : selected;
  const validAmount = Number.isFinite(amount) && amount >= 1 && amount <= 250000;
  const rounded = Math.round(amount * 100) / 100;
  const target = validAmount
    ? `/${slug}/donate?amount=${encodeURIComponent(String(rounded))}&plan=${plan}`
    : `/${slug}/donate?plan=${plan}`;

  return (
    <>
      <aside className="gl-quick-donate" aria-label="Choose a donation amount">
        <div className="gl-quick-kicker">YOUR GIFT MAKES A DIFFERENCE</div>
        <h2>Make your gift.</h2>
        <p className="gl-quick-intro">Choose an amount to continue to secure checkout.</p>
        <div className="gl-quick-frequency" role="group" aria-label="Donation frequency">
          <button type="button" aria-pressed={plan === "once"} onClick={() => setPlan("once")}>One-time</button>
          <button type="button" aria-pressed={plan === "monthly"} onClick={() => setPlan("monthly")}>Monthly</button>
        </div>
        <div className="gl-quick-label">Choose your amount</div>
        <div className="gl-quick-amounts">
          {choices.map((n) => (
            <button type="button" key={n} aria-pressed={custom === "" && selected === n}
              onClick={() => { setSelected(n); setCustom(""); }}>
              {money(n)}
            </button>
          ))}
        </div>
        <label className="gl-custom-wrap">
          <span className="sr-only">Other donation amount in dollars</span>
          <span aria-hidden="true">$</span>
          <input type="number" min="1" max="250000" step="0.01" inputMode="decimal"
            placeholder="Or enter a custom amount" value={custom}
            onChange={(e) => setCustom(e.target.value)} />
        </label>
        {matchingAvailable && plan === "once" && (
          <div className="gl-quick-match">
            <span aria-hidden="true">✦</span>
            <span>{matchMultiplier}× matching available — amplify your impact.</span>
          </div>
        )}
        {validAmount ? (
          <Link className="gl-quick-submit" href={target}>
            Donate {money(rounded)}{plan === "monthly" ? " monthly" : " now"} <span aria-hidden="true">↗</span>
          </Link>
        ) : (
          <div className="gl-quick-invalid" role="alert">Enter an amount between $1 and $250,000.</div>
        )}
        <div className="gl-quick-trust"><span aria-hidden="true">♧</span> Secure checkout · Card · Digital wallets · Bank { " · " } DAF</div>
      </aside>
      <div className="gl-mobile-donate-bar">
        <div className="gl-mobile-selected">
          <strong>{validAmount ? money(rounded) : "Your gift"}</strong>
          <span>{plan === "monthly" ? "Monthly donation" : "One-time donation"}</span>
        </div>
        <Link className="gl-mobile-donate-button" href={target}>Donate now <span aria-hidden="true">↗</span></Link>
      </div>
    </>
  );
}
