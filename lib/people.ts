// Merges gifts into people across campaigns: by email, then phone, then full name.
// An email or phone used for four or more different families (staff entering checks) is ignored for matching.
export type G = [string, string, string, string, number, string, string]; // campaignId, name, email, phone, amount, date, ambassador
export type Person = { id: string; key: string; name: string; email: string; phone: string; byCamp: Record<string, number>; lifetime: number; last: { cid: string; date: string; amount: number } | null; amb: string; gifts: number };

const norm = (n: string) => String(n || "").toLowerCase().replace(/[^a-z0-9& ]/g, " ").replace(/\s+/g, " ").trim();
const lastWord = (n: string) => norm(n).replace(/[^a-z ]/g, " ").trim().split(" ").pop() || "";

export function buildPeople(gifts: G[]): Person[] {
  const eL = new Map<string, Set<string>>(), pL = new Map<string, Set<string>>();
  for (const g of gifts) {
    const l = lastWord(g[1]);
    if (g[2]) (eL.get(g[2]) || eL.set(g[2], new Set()).get(g[2])!).add(l);
    if (g[3]) (pL.get(g[3]) || pL.set(g[3], new Set()).get(g[3])!).add(l);
  }
  const shE = new Set([...eL].filter(([, s]) => s.size >= 4).map(([k]) => k));
  const shP = new Set([...pL].filter(([, s]) => s.size >= 4).map(([k]) => k));
  const par = new Map<string, string>();
  const find = (x: string): string => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x)!)!); x = par.get(x)!; } return x; };
  const add = (x: string) => { if (!par.has(x)) par.set(x, x); };
  const toks = gifts.map((g, i) => {
    const t: string[] = [];
    const nn = norm(g[1]);
    if (g[2] && !shE.has(g[2])) t.push("e:" + g[2]);
    if (g[3] && !shP.has(g[3])) t.push("p:" + g[3]);
    if (nn && nn !== "anonymous" && nn.split(" ").length >= 2) t.push("n:" + nn);
    if (!t.length) t.push("x:" + i);
    t.forEach(add);
    t.slice(1).forEach((x) => { const a = find(t[0]), b = find(x); if (a !== b) par.set(a, b); });
    return t;
  });
  const groups = new Map<string, number[]>();
  toks.forEach((t, i) => { const r = find(t[0]); (groups.get(r) || groups.set(r, []).get(r)!).push(i); });
  const out: Person[] = [];
  groups.forEach((idx) => {
    idx.sort((a, b) => (gifts[a][5] || "").localeCompare(gifts[b][5] || ""));
    const p: Person = { id: "", key: "", name: "Anonymous", email: "", phone: "", byCamp: {}, lifetime: 0, last: null, amb: "", gifts: idx.length };
    for (const i of idx) {
      const g = gifts[i];
      p.byCamp[g[0]] = (p.byCamp[g[0]] || 0) + g[4];
      p.lifetime += g[4];
      if (norm(g[1]) !== "anonymous") p.name = g[1];
      if (g[2] && !shE.has(g[2])) p.email = g[2];
      if (g[3] && !shP.has(g[3])) p.phone = g[3];
      if (g[6]) p.amb = g[6];
      p.last = { cid: g[0], date: g[5], amount: g[4] };
    }
    const t = toks[idx[0]];
    p.key = (p.email && "e:" + p.email) || (p.phone && "p:" + p.phone) || t.find((x) => x.startsWith("n:")) || t[0];
    p.id = p.key;
    if (!p.key.startsWith("x:")) out.push(p);
  });
  return out;
}

export const firstOf = (n: string) => { const w = (n || "").trim().split(/\s+/); return w.length > 1 ? w.slice(0, -1).join(" ") : w[0] || "there"; };
export const normName = norm;
