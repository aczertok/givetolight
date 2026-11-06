import { initials, money } from "@/lib/format";

export function Progress({ value, goal, small }: { value: number; goal: number | null; small?: boolean }) {
  if (!goal) return null;
  const pct = Math.min(100, (value / goal) * 100);
  return (
    <div className={"track" + (small ? " sm" : "")} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemax={goal} aria-label="Progress toward goal">
      <div className="fill" style={{ width: pct.toFixed(1) + "%" }} />
    </div>
  );
}

const COLORS = ["#a2295a", "#14213d", "#2c7a52", "#b07a1f", "#6b4fa0", "#1f7a8c"];
export function Avatar({ name, photo, size }: { name: string; photo?: string | null; size?: number }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const s = size ? { width: size, height: size } : undefined;
  return (
    <div className="avatar" style={{ background: COLORS[h % COLORS.length], ...s }}>
      {photo ? <img src={photo} alt="" /> : initials(name)}
    </div>
  );
}

export function WithMatch({ amount, factor }: { amount: number; factor: number }) {
  return (
    <>
      {money(amount * factor)}
      {factor > 1 && <div className="x2">{money(amount)} matched</div>}
    </>
  );
}
