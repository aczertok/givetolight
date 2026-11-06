// A stand-in for the Supabase client that answers from sample data, for previews only (DEMO_MODE=1).
// It supports exactly the query shapes this site uses; writes are accepted and ignored.
import { buildDemo, DEMO_USER } from "./data";

type Row = Record<string, unknown>;
let DB: ReturnType<typeof buildDemo> | null = null;
const db = () => (DB ??= buildDemo());

const visible = (s: unknown) => s === "live" || s === "ended";
function table(name: string): Row[] {
  const d = db();
  const camp = new Map(d.campaigns.map((c) => [c.id, c]));
  switch (name) {
    case "campaigns_public":
      return d.campaigns.filter((c) => visible(c.status));
    case "teams_public":
      return d.teams.filter((t) => visible(camp.get(t.campaign_id as string)?.status));
    case "ambassadors_public":
      return d.ambassadors
        .filter((a) => a.status === "live" && visible(camp.get(a.campaign_id as string)?.status))
        .map(({ id, campaign_id, team_id, slug, name, goal, story, photo_url, created_at }) => ({ id, campaign_id, team_id, slug, name, goal, story, photo_url, created_at }));
    case "donations_public":
      return d.donations
        .filter((x) => x.status === "succeeded" && x.provider !== "import" && visible(camp.get(x.campaign_id as string)?.status))
        .map((x) => ({
          id: x.id, campaign_id: x.campaign_id, ambassador_id: x.ambassador_id, team_id: x.team_id,
          display_name: x.anonymous ? "Anonymous" : (x.donor_name as string) || "Anonymous", amount: x.amount,
          dedication: x.dedication, message: x.anonymous ? null : x.message, plan: x.plan, created_at: x.created_at,
        }));
    default:
      return ((d as unknown as Record<string, Row[]>)[name]) || [];
  }
}

type Filter = (r: Row) => boolean;
class Query implements PromiseLike<{ data: unknown; error: null; count?: number }> {
  private filters: Filter[] = [];
  private orders: { col: string; asc: boolean; nullsFirst: boolean }[] = [];
  private from = 0;
  private to = Infinity;
  private mode: "many" | "one" | "maybe" = "many";
  private head = false;
  private write = false;
  constructor(private name: string) {}
  select(_cols?: string, opts?: { count?: string; head?: boolean }) { if (opts?.head) this.head = true; return this; }
  eq(col: string, v: unknown) { this.filters.push((r) => r[col] === v); return this; }
  in(col: string, vs: unknown[]) { const s = new Set(vs); this.filters.push((r) => s.has(r[col])); return this; }
  order(col: string, o?: { ascending?: boolean; nullsFirst?: boolean }) { const asc = o?.ascending !== false; this.orders.push({ col, asc, nullsFirst: o?.nullsFirst ?? !asc }); return this; }
  range(a: number, b: number) { this.from = a; this.to = b; return this; }
  limit(n: number) { this.to = this.from + n - 1; return this; }
  single() { this.mode = "one"; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  insert() { this.write = true; return this; }
  update() { this.write = true; return this; }
  upsert() { this.write = true; return this; }
  delete() { this.write = true; return this; }
  private run() {
    if (this.write) return { data: this.mode === "many" ? [] : { id: "demo" }, error: null };
    let rows = table(this.name).filter((r) => this.filters.every((f) => f(r)));
    const count = rows.length;
    if (this.head) return { data: null, error: null, count };
    rows = [...rows].sort((a, b) => {
      for (const o of this.orders) {
        const x = a[o.col], y = b[o.col];
        if (x === y) continue;
        if (x == null) return o.nullsFirst ? -1 : 1;
        if (y == null) return o.nullsFirst ? 1 : -1;
        const c = x < y ? -1 : 1;
        return o.asc ? c : -c;
      }
      return 0;
    });
    rows = rows.slice(this.from, this.to === Infinity ? undefined : this.to + 1);
    if (this.mode !== "many") return { data: rows[0] ?? null, error: null };
    return { data: rows, error: null, count };
  }
  then<A, B>(ok?: ((v: { data: unknown; error: null; count?: number }) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null) {
    return Promise.resolve(this.run()).then(ok, bad);
  }
}

function rpc(name: string, args?: Record<string, unknown>) {
  const d = db();
  const ok = (data: unknown) => Promise.resolve({ data, error: null });
  if (name === "is_admin") return ok(true);
  const sumFor = (cid: string) => d.donations.filter((x) => x.campaign_id === cid && x.status === "succeeded");
  if (name === "campaign_totals") {
    const c = d.campaigns.find((x) => x.id === args?.p_campaign);
    if (!c || !visible(c.status)) return ok([]);
    const g = sumFor(c.id as string);
    const raised = g.reduce((s, x) => s + Number(x.amount), 0);
    const m = Number(c.match_multiplier);
    return ok([{ raised, donors: g.length, matched: Math.min(raised * (m - 1), c.match_cap == null ? Infinity : Number(c.match_cap)) }]);
  }
  if (name === "admin_campaign_totals") {
    return ok(d.campaigns.map((c) => { const g = sumFor(c.id as string); return { campaign_id: c.id, gifts: g.length, raised: g.reduce((s, x) => s + Number(x.amount), 0) }; }));
  }
  return ok(null);
}

export function demoClient() {
  return {
    from: (name: string) => new Query(name),
    rpc,
    auth: {
      getUser: async () => ({ data: { user: { id: DEMO_USER.id, email: DEMO_USER.email } }, error: null }),
      signOut: async () => ({ error: null }),
      exchangeCodeForSession: async () => ({ error: null }),
    },
  };
}
