"use client";
import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/format";

type Props = {
  campaign: { slug: string; name: string; match: number; presets: number[] };
  ambassadors: { slug: string; name: string }[];
  teams: { slug: string; name: string }[];
  initialAmbassador: string;
  initialTeam: string;
  chariotCid: string;
  initialAmount?: number;
  initialPlan?: "once" | "monthly";
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace React.JSX {
    interface IntrinsicElements {
      "chariot-connect": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { cid?: string; context?: string; theme?: string };
    }
  }
}

const CHAI: Record<number, string> = { 36: "2× chai", 180: "10× chai", 360: "20× chai", 1800: "100× chai" };

export default function DonateForm({ campaign, ambassadors, teams, initialAmbassador, initialTeam, chariotCid, initialAmount, initialPlan = "once" }: Props) {
  const [preset, setPreset] = useState<number | null>(initialAmount ?? campaign.presets[1] ?? campaign.presets[0] ?? 180);
  const [custom, setCustom] = useState("");
  const [plan, setPlan] = useState<"once" | "monthly" | "installments">(initialPlan);
  const [months, setMonths] = useState(12);
  const [credit, setCredit] = useState(initialAmbassador ? "a:" + initialAmbassador : initialTeam ? "t:" + initialTeam : "");
  const [f, setF] = useState({ name: "", email: "", phone: "", dedication: "", message: "", anonymous: false, coverFee: false });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const chariotRef = useRef<HTMLElement | null>(null);

  const amount = custom !== "" ? Math.round(Number(custom) * 100) / 100 : preset || 0;
  const perPayment = plan === "installments" ? amount / months : amount;
  const fee = f.coverFee ? Math.round(((perPayment + 0.3) / (1 - 0.029) - perPayment) * 100) / 100 : 0;

  const form = () => ({
    campaign: campaign.slug,
    ambassador: credit.startsWith("a:") ? credit.slice(2) : "",
    team: credit.startsWith("t:") ? credit.slice(2) : "",
    amount,
    plan,
    months,
    ...f,
  });
  const check = () => {
    if (!(amount >= 1)) return "Choose or enter an amount.";
    if (!f.name.trim()) return "Enter your name for the receipt.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) return "Enter a valid email for the receipt.";
    return "";
  };

  async function pay(method: "card" | "wallet" | "ach") {
    const problem = check();
    if (problem) return setErr(problem);
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form(), method }) });
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error || "Something went wrong.");
      location.assign(j.url);
    } catch (x) {
      setErr((x as Error).message);
      setBusy(false);
    }
  }

  // Our DAF button opens Chariot's window by pressing Chariot's own (hidden) button.
  function payDaf() {
    const problem = check();
    if (problem) return setErr(problem);
    setErr("");
    const el = chariotRef.current as (HTMLElement & { shadowRoot: ShadowRoot | null }) | null;
    const inner = el?.shadowRoot?.querySelector("button") || el?.querySelector("button");
    if (inner) (inner as HTMLButtonElement).click();
    else setErr("DAF giving is still loading. Try again in a moment.");
  }

  // Chariot DAFpay: on success we record the grant.
  const formRef = useRef(form);
  formRef.current = form;
  const checkRef = useRef(check);
  checkRef.current = check;
  useEffect(() => {
    if (!chariotCid) return;
    const s = document.createElement("script");
    s.src = "https://cdn.givechariot.com/chariot-connect.umd.js";
    s.async = true;
    document.body.appendChild(s);
    const el = chariotRef.current as (HTMLElement & { onDonationRequest?: (fn: () => Promise<unknown>) => void }) | null;
    let tries = 0;
    const wire = setInterval(() => {
      tries++;
      if (el?.onDonationRequest) {
        clearInterval(wire);
        el.onDonationRequest(async () => {
          const problem = checkRef.current();
          if (problem) { setErr(problem); return false; }
          const v = formRef.current();
          const [first, ...rest] = v.name.trim().split(/\s+/);
          return {
            amount: Math.round((v.plan === "installments" ? v.amount : v.amount) * 100),
            firstName: first,
            lastName: rest.join(" "),
            email: v.email.trim(),
            anonymous: v.anonymous,
            note: [v.dedication, v.message].filter(Boolean).join(" · ").slice(0, 400) || undefined,
            frequency: v.plan === "monthly" ? "MONTHLY" : "ONE_TIME",
            metadata: { campaign: v.campaign, ambassador: v.ambassador, team: v.team },
          };
        });
      } else if (tries > 50) clearInterval(wire);
    }, 200);
    const onSuccess = async (ev: Event) => {
      const detail = (ev as CustomEvent).detail || {};
      setBusy(true);
      try {
        const r = await fetch("/api/chariot/grant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...detail, form: formRef.current() }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "We couldn't record your DAF gift.");
        location.assign(`/thank-you?daf=1&c=${encodeURIComponent(campaign.slug)}`);
      } catch (x) {
        setErr((x as Error).message);
        setBusy(false);
      }
    };
    el?.addEventListener("CHARIOT_SUCCESS", onSuccess);
    return () => { clearInterval(wire); el?.removeEventListener("CHARIOT_SUCCESS", onSuccess); };
  }, [chariotCid, campaign.slug]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value });

  return (
    <form className="panel" onSubmit={(e) => { e.preventDefault(); pay("card"); }} noValidate>
      <div className="gl-checkout-heading">Your donation <span>Choose how much to give</span></div>
      <div className="amts">
        {campaign.presets.map((p) => (
          <button type="button" key={p} className="opt num" aria-pressed={custom === "" && preset === p} onClick={() => { setPreset(p); setCustom(""); }}>
            {money(p)}{CHAI[p] && <span className="meta" style={{ display: "block", fontWeight: 500 }}>{CHAI[p]}</span>}
          </button>
        ))}
        <input className="in num" type="number" min="1" step="1" inputMode="decimal" placeholder="Other amount" value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Other amount" />
      </div>
      {campaign.match > 1 && amount > 0 && (
        <div className="note-box num">You give <b>{money(amount)}</b>, and with the match the campaign receives <b>{money(amount * campaign.match)}</b>.</div>
      )}
      <div className="seg" role="group" aria-label="How often">
        {([["once", "One-time"], ["installments", "Split monthly"], ["monthly", "Monthly ongoing"]] as const).map(([k, l]) => (
          <button type="button" key={k} className="opt" aria-pressed={plan === k} onClick={() => setPlan(k)}>{l}</button>
        ))}
      </div>
      {plan === "installments" && (
        <label className="f">Number of months
          <select className="in" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            {[2, 3, 4, 6, 10, 12, 18, 24].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <span className="meta num" style={{ fontWeight: 400 }}>{money(perPayment, true)} a month for {months} months. Your full pledge of {money(amount)} counts today.</span>
        </label>
      )}
      {plan === "monthly" && <p className="num">{money(amount)} every month until you cancel. Each payment counts toward the campaign.</p>}
      {(ambassadors.length > 0 || teams.length > 0) && (
        <label className="f">Credit this gift to
          <select className="in" value={credit} onChange={(e) => setCredit(e.target.value)}>
            <option value="">{campaign.name} (general)</option>
            {ambassadors.length > 0 && <optgroup label="Ambassadors">{ambassadors.map((a) => <option key={a.slug} value={"a:" + a.slug}>{a.name}</option>)}</optgroup>}
            {teams.length > 0 && <optgroup label="Teams">{teams.map((t) => <option key={t.slug} value={"t:" + t.slug}>{t.name}</option>)}</optgroup>}
          </select>
        </label>
      )}
      <div className="gl-checkout-heading">Your details <span>Just two essentials to get started</span></div>
      <div className="form-grid">
        <label className="f">Full name<input className="in" value={f.name} onChange={set("name")} autoComplete="name" required /></label>
        <label className="f">Email for your receipt<input className="in" type="email" value={f.email} onChange={set("email")} autoComplete="email" required /></label>
      </div>
      <details className="gl-checkout-optional">
        <summary>More options: dedication, phone &amp; donor privacy</summary>
        <div className="gl-checkout-extra-fields">
          <label className="f">Phone (optional)<input className="in" type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" /></label>
          <label className="f">Dedication (optional)<input className="in" value={f.dedication} onChange={set("dedication")} placeholder="In honor of / l'ilui nishmas…" maxLength={140} /></label>
          <label className="f">Message for the donor wall (optional)<input className="in" value={f.message} onChange={set("message")} maxLength={280} /></label>
          <label className="chk"><input type="checkbox" checked={f.anonymous} onChange={set("anonymous")} /> Show my name as Anonymous</label>
        </div>
      </details>
      <label className="chk gl-fee-option"><input type="checkbox" checked={f.coverFee} onChange={set("coverFee")} /> <span className="num">Add {money(fee || 0, true)} to help cover processing fees (optional)</span></label>
      <div className="total num"><span>{plan === "once" ? "Total" : "Charged today"}</span><span>{money(perPayment + fee, true)}</span></div>
      {err && <p className="error" role="alert">{err}</p>}
      <div className="pay-label">Choose how to pay</div>
      <div className={"pay-grid" + (chariotCid ? "" : " three")}>
        <button type="submit" className="pay-btn" data-method="card" disabled={busy || !(amount >= 1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 9.5h19M6 15h4" /></svg>
          <span>Credit card</span>
        </button>
        <button type="button" className="pay-btn" data-method="wallet" disabled={busy || !(amount >= 1)} onClick={() => pay("wallet")}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></svg>
          <span>Apple Pay / Google Pay</span>
        </button>
        <button type="button" className="pay-btn" data-method="ach" disabled={busy || !(amount >= 1)} onClick={() => pay("ach")}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9.5 12 4l9 5.5M4.5 10v8M9.5 10v8M14.5 10v8M19.5 10v8M3 20h18" /></svg>
          <span>Bank transfer</span>
        </button>
        {chariotCid && (
          <button type="button" className="pay-btn" data-method="daf" disabled={busy || !(amount >= 1)} onClick={payDaf}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
            <span>DAF: OJC, Donors&apos; Fund, Matbia &amp; more</span>
          </button>
        )}
      </div>
      {busy && <p className="meta" style={{ textAlign: "center" }}>One moment…</p>}
      {chariotCid && plan === "installments" && <p className="meta" style={{ textAlign: "center" }}>DAF gifts go as one grant for the full amount.</p>}
      {f.coverFee && <p className="meta" style={{ textAlign: "center" }}>DAF gifts have no card fee, so the fee isn&apos;t added to them.</p>}
      {chariotCid && (
        <div className="chariot-hidden" aria-hidden="true">
          <chariot-connect ref={chariotRef} id="chariot" cid={chariotCid} context="popup" theme="LightModeTheme" />
        </div>
      )}
    </form>
  );
}
