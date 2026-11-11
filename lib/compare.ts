import { buildPeople, normName, type G } from "@/lib/people";

// One gift row passed to the browser: name, email, phone, amount, date (YYYY-MM-DD), ambassador, team
export type CG = [string, string, string, number, string, string, string];
export type CPerson = { key: string; name: string; email: string; phone: string; prev: number; next: number; prevN: number; nextN: number; prevAmb: string; nextAmb: string; lastDate: string };

/** Matches donors across two campaigns (email, then phone, then full name) and totals each side. */
export function comparePeople(prev: CG[], next: CG[]): CPerson[] {
  const all: G[] = [...prev.map((g) => ["prev", g[0], g[1], g[2], g[3], g[4], g[5]] as G), ...next.map((g) => ["next", g[0], g[1], g[2], g[3], g[4], g[5]] as G)];
  const people = buildPeople(all);
  const e = new Map<string, CPerson>(), p = new Map<string, CPerson>(), n = new Map<string, CPerson>();
  const out: CPerson[] = people.map((x) => {
    const c: CPerson = { key: x.key, name: x.name, email: x.email, phone: x.phone, prev: x.byCamp.prev || 0, next: x.byCamp.next || 0, prevN: 0, nextN: 0, prevAmb: "", nextAmb: "", lastDate: x.last?.date || "" };
    if (x.email) e.set(x.email, c); if (x.phone) p.set(x.phone, c); n.set(normName(x.name), c);
    return c;
  });
  const find = (g: CG) => (g[1] && e.get(g[1])) || (g[2] && p.get(g[2])) || n.get(normName(g[0]));
  prev.forEach((g) => { const c = find(g); if (c) { c.prevN++; if (g[5] && !c.prevAmb) c.prevAmb = g[5]; else if (!g[5] && g[6] && !c.prevAmb) c.prevAmb = g[6]; } });
  next.forEach((g) => { const c = find(g); if (c) { c.nextN++; if (g[5] && !c.nextAmb) c.nextAmb = g[5]; else if (!g[5] && g[6] && !c.nextAmb) c.nextAmb = g[6]; } });
  return out.filter((c) => normName(c.name) !== "anonymous" || c.email || c.phone);
}
