// Reads a CauseMatch / Charidy / Chariot / generic donor export (CSV) into plain rows.
export type ParsedRow = { name: string; email: string; phone: string; amount: number; date: string; method: string; ambassador: string; team: string; anonymous: boolean };

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); f = ""; if (row.some((x) => x.trim())) rows.push(row); row = []; }
    else f += c;
  }
  row.push(f);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

export function guessColumns(headers: string[]) {
  const H = headers.map((x) => String(x).toLowerCase().trim());
  const find = (re: RegExp, not?: RegExp) => H.findIndex((x) => re.test(x) && !(not && not.test(x)));
  const pick = (...a: number[]) => a.find((i) => i >= 0) ?? -1;
  const first = find(/first/), last = find(/last|surname/);
  return {
    first, last,
    name: first >= 0 && last >= 0 ? -1 : pick(find(/^(donor |full )?name$/), find(/donor name|full name/), find(/display name/)),
    email: find(/e-?mail/),
    phone: find(/phone|mobile|cell/, /prefix/),
    amount: pick(find(/without multiplier/), H.indexOf("amount"), find(/donation amount|gift amount|amount/, /match|fee|goal|net|count|recurring|refund|converted|local|perk|tip/)),
    date: pick(find(/^date \((mm|dd)\/(dd|mm)\/yyyy\)/), find(/date|created/, /pledge|refund|batch|due|reminder/)),
    ddmm: H.some((h) => /dd\/mm\/yyyy/.test(h)),
    method: pick(find(/payment method/), find(/method|source/, /date|id/)),
    method2: pick(find(/donation type/), find(/payment type/)),
    ambassador: find(/ambassador|fundraiser|hiker|player|referr|solicitor/),
    team: find(/team|communit|group/),
    privacy: find(/^privacy$|anonymous/),
    campaign: find(/^campaign( name)?$/),
  };
}

export function toRows(table: string[][]) {
  const hi = table.findIndex((r) => r.filter((x) => String(x).trim()).length >= 3);
  if (hi < 0) return { rows: [] as ParsedRow[], campaign: "", skipped: 0, map: null };
  const m = guessColumns(table[hi].map(String));
  const g = (r: string[], i: number) => (i >= 0 ? String(r[i] ?? "").trim() : "");
  const rows: ParsedRow[] = [];
  let skipped = 0;
  const camps: Record<string, number> = {};
  for (const r of table.slice(hi + 1)) {
    const raw = g(r, m.amount).replace(/[$,\s]/g, "");
    if (!/^-?\d+(\.\d+)?$/.test(raw) || !(Number(raw) > 0)) { skipped++; continue; } // skips "Total amount:" rows
    const cn = g(r, m.campaign); if (cn) camps[cn] = (camps[cn] || 0) + 1;
    const name = (g(r, m.name) || [g(r, m.first), g(r, m.last)].filter(Boolean).join(" ")).replace(/\s+/g, " ") || "Anonymous";
    const dm = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(g(r, m.date));
    let date = "";
    if (dm) { const [, a, b, y] = dm; const mo = m.ddmm ? b : a, da = m.ddmm ? a : b; date = `${y}-${mo.padStart(2, "0")}-${da.padStart(2, "0")}`; }
    else if (/^\d{4}-\d{2}-\d{2}/.test(g(r, m.date))) date = g(r, m.date).slice(0, 10);
    const m2 = g(r, m.method2);
    const method = (g(r, m.method) || (/^(stripe|bulk import)$/i.test(m2) ? "" : m2)).slice(0, 40);
    rows.push({ name, email: g(r, m.email).toLowerCase(), phone: g(r, m.phone), amount: Math.round(Number(raw) * 100) / 100, date, method, ambassador: g(r, m.ambassador).replace(/\s+/g, " "), team: g(r, m.team), anonymous: /^true$/i.test(g(r, m.privacy)) });
  }
  const campaign = Object.entries(camps).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  return { rows, campaign, skipped, map: m };
}
