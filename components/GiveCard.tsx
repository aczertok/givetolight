"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/format";

const CHAI: Record<number, string> = { 18: "chai", 36: "2× chai", 54: "3× chai", 72: "4× chai", 180: "10× chai", 360: "20× chai", 1800: "100× chai" };

type Props = {
  slug: string;
  presets: number[];
  matchMultiplier: number;
  matchingAvailable: boolean;
  daf: boolean;
  /** Ambassador or team slug the gift is credited to, when the card sits on their page. */
  credit?: { a?: string; t?: string };
  title?: string;
  oneTimeOnly?: boolean;
};

export default function GiveCard({ slug, presets, matchMultiplier, matchingAvailable, daf, credit, title = "Make your gift", oneTimeOnly = false }: Props) {
  const clean = [...new Set(presets.filter((n) => Number.isFinite(n) && n >= 1 && n <= 250000))].slice(0, 6);
  const tiles = clean.length >= 3 ? clean : [72, 180, 360, 500, 1000, 1800];
  const [picked, setPicked] = useState(tiles[Math.min(1, tiles.length - 1)]);
  const [custom, setCustom] = useState("");
  const [plan, setPlan] = useState<"once" | "monthly">("once");
  const [inView, setInView] = useState(true);
  const ref = useRef<HTMLElement>(null);

  const raw = custom === "" ? picked : Number(custom);
  const valid = Number.isFinite(raw) && raw >= 1 && raw <= 250000;
  const amount = valid ? Math.round(raw * 100) / 100 : 0;
  const effectivePlan = oneTimeOnly ? "once" : plan;
  const match = matchingAvailable && effectivePlan === "once" && matchMultiplier > 1;
  const q = new URLSearchParams({ amount: String(amount), plan: effectivePlan });
  if (credit?.a) q.set("a", credit.a);
  if (credit?.t) q.set("t", credit.t);
  const href = `/${slug}/donate?${q}`;

  // The phone bar only shows once the card itself has scrolled away.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <section className={"lc-give" + (oneTimeOnly ? " vl-give" : "")} id="donate" ref={ref} aria-labelledby="give-title">
        <div className="lc-give-body">
          <h2 id="give-title">{title}</h2>
          {!oneTimeOnly && <div className="lc-plan" role="group" aria-label="How often">
            <button type="button" aria-pressed={plan === "once"} onClick={() => setPlan("once")}>One-time</button>
            <button type="button" aria-pressed={plan === "monthly"} onClick={() => setPlan("monthly")}>Monthly</button>
          </div>}
          <div className="lc-tiles" role="group" aria-label="Amount">
            {tiles.map((n) => (
              <button type="button" key={n} aria-pressed={custom === "" && picked === n} onClick={() => { setPicked(n); setCustom(""); }}>
                <span className="num">{money(n)}</span>
                {CHAI[n] && <small>{CHAI[n]}</small>}
              </button>
            ))}
          </div>
          <label className={"lc-other" + (custom !== "" ? " on" : "")}>
            <span aria-hidden="true">$</span>
            <input type="number" min="1" max="250000" step="1" inputMode="decimal" placeholder="Other amount" aria-label="Other amount"
              value={custom} onChange={(e) => setCustom(e.target.value)} />
            {effectivePlan === "monthly" && <em>/ month</em>}
          </label>
          {match && valid && (
            <p className="lc-impact num">You give <b>{money(amount)}</b> <span aria-hidden="true">→</span> the campaign receives <b>{money(amount * matchMultiplier)}</b></p>
          )}
          {valid ? (
            <Link href={href} className="lc-cta">
              Donate {money(amount)}{effectivePlan === "monthly" ? " monthly" : ""}
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11m-4-5 5 5-5 5" /></svg>
            </Link>
          ) : (
            <p className="lc-give-err" role="alert">Enter an amount from $1 to $250,000.</p>
          )}
          <p className="lc-trust"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4" y="9" width="12" height="8" rx="2" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" /></svg>Secure · Tax-deductible · Card, Apple Pay, bank{daf ? ", DAF" : ""}</p>
        </div>
      </section>
      <div className={"lc-bar" + (oneTimeOnly ? " vl-sticky" : "") + (inView ? "" : " show")} aria-hidden={inView}>
        <div className="lc-bar-in">
          <div className="lc-bar-amt num">
            <b>{valid ? money(amount) : "—"}</b>
            <small>{match ? `${matchMultiplier}× matched` : effectivePlan === "monthly" ? "per month" : "one-time gift"}</small>
          </div>
          {valid ? <Link href={href} className="lc-cta" tabIndex={inView ? -1 : 0}>Donate now</Link>
            : <a href="#donate" className="lc-cta" tabIndex={inView ? -1 : 0}>Choose amount</a>}
        </div>
      </div>
    </>
  );
}
