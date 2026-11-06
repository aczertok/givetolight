// Sample data for previewing the site before the database is connected.
// Only used when the DEMO_MODE=1 environment variable is set. Every name, email and phone here is made up.

type Row = Record<string, unknown>;

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DEMO_USER = { id: "demo-user", email: "staff@example.com" };

export function buildDemo() {
  const r = rng(20271105);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const now = Date.now();
  const iso = (minsAgo: number) => new Date(now - minsAgo * 60000).toISOString();
  const day = 1440;

  const FIRST = ["Sarah", "Rivky", "Yossi", "Moshe", "Chaya", "Dovid", "Leah", "Avi", "Miriam", "Shmuel", "Esther", "Yaakov", "Malky", "Baruch", "Faigy", "Eli", "Gitty", "Chaim", "Rochel", "Mendy", "Tzippy", "Shimon", "Dena", "Ari", "Pnina", "Yehuda", "Brocha", "Nachum", "Toby", "Zev"];
  const LAST = "ABCDFGHKLMNPRSTWZ".split("");
  const people = Array.from({ length: 340 }, (_, i) => {
    const couple = r() < 0.28;
    const a = pick(FIRST), b = pick(FIRST);
    const li = LAST[i % LAST.length];
    const name = couple && a !== b ? `${a} & ${b} ${li}.` : r() < 0.12 ? `The ${li}. Family` : `${a} ${li}.`;
    const slug = name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
    return { name, email: `${slug}${i}@example.com`, phone: r() < 0.85 ? `+1555${String(1000000 + i * 2711).slice(-7)}` : "" };
  });

  const AMTS = [18, 36, 36, 36, 54, 72, 100, 100, 180, 180, 180, 180, 250, 360, 360, 360, 500, 500, 1000, 1000, 1800, 3600, 5000];
  const amount = () => pick(AMTS);
  const DEDIC = ["In honor of the Lighthouse staff", "In memory of Bubby Sarah", "In honor of our daughter", "For the girls of the Sunday group", ""];
  const MSG = ["Go Sunday group!", "So proud of you!", "Kol hakavod to everyone involved", "Keep shining!", "Love what you do", "Hatzlacha!", ""];
  const DAF = ["OJC Fund", "The Donors' Fund", "Matbia", "Fidelity Charitable"];

  // ---- campaigns
  const story =
    "The Lighthouse Project gives young women ages 15–25 in Monsey and Pomona a place that is theirs: weekly evening groups, mentors and programming all year round.\n\nEvery gift to this campaign keeps those doors open. Give directly, or give through an ambassador or team you know.\n\nThis year our matchers are doubling every gift up to their pledge, so your support goes twice as far.";
  const campaigns: Row[] = [
    { id: "c-hike-2027", slug: "hike-2027", name: "Hike for Light 2027", kind: "hike", year: 2027, tagline: "Walk with us for the girls of The Lighthouse Project.", story, cover_url: null, goal: 175000, match_multiplier: 2, match_cap: 40000, match_note: "Our matchers are doubling every gift, up to $40,000", starts_at: iso(9 * day), ends_at: new Date(now + 9 * day * 60000 + 5 * 3600000).toISOString(), status: "live", show_on_home: true, ambassador_approval: true, preset_amounts: [36, 180, 360, 1000, 1800], created_at: iso(30 * day) },
    { id: "c-vb-2027", slug: "volleyball-2027", name: "Volleyball Tournament 2027", kind: "volleyball", year: 2027, tagline: "Our annual tournament for The Lighthouse Project.", story, cover_url: null, goal: 210000, match_multiplier: 1, match_cap: null, match_note: null, starts_at: null, ends_at: null, status: "draft", show_on_home: true, ambassador_approval: true, preset_amounts: [100, 180, 360, 1000, 1800, 3600], created_at: iso(10 * day) },
    { id: "c-hike-2026", slug: "hike-2026", name: "Hike for Life 2026", kind: "hike", year: 2026, tagline: null, story: null, cover_url: null, goal: 90000, match_multiplier: 1, match_cap: null, match_note: null, starts_at: null, ends_at: iso(200 * day), status: "ended", show_on_home: false, ambassador_approval: true, preset_amounts: [36, 180, 360, 1000, 1800], created_at: iso(400 * day) },
    { id: "c-hike-2025", slug: "hike-2025", name: "Hike for Light 2025", kind: "hike", year: 2025, tagline: null, story: null, cover_url: null, goal: 80000, match_multiplier: 1, match_cap: null, match_note: null, starts_at: null, ends_at: iso(560 * day), status: "ended", show_on_home: false, ambassador_approval: true, preset_amounts: [36, 180, 360, 1000, 1800], created_at: iso(700 * day) },
    { id: "c-vb-2026", slug: "volleyball-2026", name: "Volleyball Tournament 2026", kind: "volleyball", year: 2026, tagline: null, story: null, cover_url: null, goal: 200000, match_multiplier: 1, match_cap: null, match_note: null, starts_at: null, ends_at: iso(90 * day), status: "ended", show_on_home: false, ambassador_approval: true, preset_amounts: [100, 180, 360, 1000, 1800], created_at: iso(300 * day) },
  ];

  // ---- teams (live hike)
  const teams: Row[] = [
    { id: "t-sun", campaign_id: "c-hike-2027", slug: "sunday-group", name: "Sunday Night Group", goal: 45000, blurb: "Our 15–18 crew. Sunday nights, 8–10 PM.", photo_url: null, created_at: iso(30 * day) },
    { id: "t-thu", campaign_id: "c-hike-2027", slug: "thursday-group", name: "Thursday Night Group", goal: 45000, blurb: "The 18–25 group that keeps showing up.", photo_url: null, created_at: iso(30 * day) },
    { id: "t-alum", campaign_id: "c-hike-2027", slug: "alumni", name: "Lighthouse Alumni", goal: 30000, blurb: "Graduates paying it forward.", photo_url: null, created_at: iso(30 * day) },
    { id: "t-fam", campaign_id: "c-hike-2027", slug: "parents-friends", name: "Parents & Friends", goal: 55000, blurb: "Families and neighbors who believe in this.", photo_url: null, created_at: iso(30 * day) },
  ];

  // ---- ambassadors (live hike)
  const A: [string, string, number, string][] = [
    ["Rivka S.", "t-sun", 5000, "I joined two years ago and it changed my week. Help me give that to the next girl."],
    ["Leah G.", "t-sun", 3600, "Sunday nights are the highlight of my week."],
    ["Miri L.", "t-sun", 1800, "First year as an ambassador!"],
    ["Sori H.", "t-sun", 2500, ""],
    ["Dina K.", "t-thu", 10000, "Going for $10K. Every dollar is doubled."],
    ["Shira M.", "t-thu", 5000, "This place gave me friends and mentors. Your gift keeps the doors open."],
    ["Esti F.", "t-thu", 3600, ""],
    ["Malka P.", "t-thu", 2500, "Walking every step for the girls."],
    ["Tova B.", "t-alum", 7200, "I was in the first cohort. Now it's my turn to give back."],
    ["Chaya R.", "t-alum", 3600, "Proud alumna, proud ambassador."],
    ["Nechama D.", "t-alum", 2500, ""],
    ["The W. Family", "t-fam", 18000, "Our daughter found her people here. We're all in."],
    ["The F. Family", "t-fam", 10000, "Join us in doubling this year's impact."],
    ["Bracha W.", "t-fam", 3600, ""],
  ];
  const ambassadors: Row[] = A.map(([name, team, goal, st], i) => ({
    id: `a-${i}`, campaign_id: "c-hike-2027", team_id: team, user_id: i === 0 ? DEMO_USER.id : null,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), name, story: st || null, photo_url: null,
    phone: `+1555${String(2000000 + i * 37).slice(-7)}`, goal: Math.round(goal * 2.5 / 100) * 100, email: `ambassador${i}@example.com`, status: "live", created_at: iso((28 - i) * day),
  }));
  ambassadors.push(
    { id: "a-p1", campaign_id: "c-hike-2027", team_id: "t-sun", user_id: null, slug: "ahuva-t", name: "Ahuva T.", goal: 1800, story: "Can't wait to hike with everyone!", photo_url: null, phone: "+15552009001", email: "ahuva@example.com", status: "pending", created_at: iso(300) },
    { id: "a-p2", campaign_id: "c-hike-2027", team_id: "t-alum", user_id: null, slug: "gitty-l", name: "Gitty L.", goal: 2500, story: null, photo_url: null, phone: "+15552009002", email: "gitty@example.com", status: "pending", created_at: iso(120) },
  );
  const liveAmb = ambassadors.filter((a) => a.status === "live");
  const ambWeight = liveAmb.map((a) => Number(a.goal));
  const pickAmb = () => {
    let x = r() * ambWeight.reduce((s, w) => s + w, 0);
    for (let i = 0; i < liveAmb.length; i++) { x -= ambWeight[i]; if (x <= 0) return liveAmb[i]; }
    return liveAmb[0];
  };

  // ---- donations
  const donations: Row[] = [];
  let n = 0;
  const PAST_AMB = ["Rivka S.", "Dina K.", "Tova B.", "Shira M.", "The W. Family", "Pnina A.", "Raizy K.", "Leah G.", "Chaya R.", "Esti F.", "The F. Family", "Devora S."];
  const past = (cid: string, count: number, from: number, to: number, endedMinsAgo: number, mult = 1) => {
    for (let i = 0; i < count; i++) {
      const p = people[Math.floor(from + r() * (to - from))];
      donations.push({
        id: `d${++n}`, campaign_id: cid, ambassador_id: null, team_id: null, ambassador_name: r() < 0.8 ? pick(PAST_AMB) : null, team_name: null,
        donor_name: p.name, donor_email: p.email, donor_phone: p.phone || null, anonymous: false, dedication: null, message: null,
        amount: amount() * mult, fee_covered: 0, method: pick(["card", "card", "card", "daf", "check"]), method_detail: null,
        provider: "import", provider_ref: null, plan: null, status: "succeeded", entered_by: DEMO_USER.id, created_at: iso(endedMinsAgo + Math.floor(r() * 10 * day)),
      });
    }
  };
  past("c-hike-2025", 230, 0, 220, 560 * day);
  past("c-hike-2026", 260, 40, 300, 200 * day);
  past("c-vb-2026", 170, 120, 340, 90 * day, 2);

  // live hike: about a third of past hike donors have renewed, plus new donors
  const renewers = people.slice(40, 300).filter(() => r() < 0.34);
  const newcomers = people.slice(300).filter(() => r() < 0.7);
  const live = [...renewers, ...newcomers];
  live.forEach((p) => {
    const amb = r() < 0.78 ? pickAmb() : null;
    const methodRoll = r();
    const method = methodRoll < 0.6 ? "card" : methodRoll < 0.8 ? "daf" : methodRoll < 0.87 ? "ach" : "check";
    const planRoll = r();
    const plan = method === "card" && planRoll < 0.06 ? "monthly" : method === "card" && planRoll < 0.11 ? "installments:12" : null;
    const amt = amount();
    donations.push({
      id: `d${++n}`, campaign_id: "c-hike-2027", ambassador_id: amb?.id ?? null, team_id: amb?.team_id ?? (r() < 0.1 ? pick(teams).id : null),
      ambassador_name: null, team_name: null, donor_name: p.name, donor_email: p.email, donor_phone: p.phone || null,
      anonymous: r() < 0.08, dedication: r() < 0.15 ? pick(DEDIC) || null : null, message: r() < 0.25 ? pick(MSG) || null : null,
      amount: amt, fee_covered: method === "card" || method === "ach" ? Math.round(((amt + 0.3) / 0.971 - amt) * 100) / 100 : 0,
      method, method_detail: method === "daf" ? pick(DAF) : method === "check" ? `Check #${1000 + Math.floor(r() * 9000)}` : null,
      provider: method === "daf" ? "chariot" : method === "check" ? "offline" : "stripe", provider_ref: `demo_${n}`, plan, status: "succeeded",
      entered_by: null, created_at: iso(Math.floor(Math.pow(r(), 1.6) * 9 * day)),
    });
  });
  donations.push({ id: `d${++n}`, campaign_id: "c-hike-2027", ambassador_id: null, team_id: null, ambassador_name: null, team_name: null, donor_name: "Gitty B.", donor_email: "gitty.b@example.com", donor_phone: null, anonymous: false, dedication: null, message: null, amount: 360, fee_covered: 0, method: "ach", method_detail: null, provider: "stripe", provider_ref: `demo_${n}`, plan: null, status: "pending", entered_by: null, created_at: iso(45) });

  const outreach: Row[] = renewers.length ? people.slice(40, 300).filter(() => r() < 0.12).map((p) => ({ campaign_id: "c-hike-2027", donor_key: p.email ? "e:" + p.email : "p:" + p.phone, texted_at: iso(Math.floor(r() * 3 * day)), note: null })) : [];
  const message_templates: Row[] = [
    { id: "donor", body: "Hi {first}! Thank you for giving {amount} to the Lighthouse {kind} last time. {campaign} is now live, and the girls would love your support again: {link}" },
    { id: "ambassador", body: "Hi {first}! You raised {raised} as an ambassador last time, thank you! Would you be an ambassador again for {campaign}? Sign up here: {link}" },
  ];
  return { admins: [{ user_id: DEMO_USER.id, added_at: iso(400 * day) }], campaigns, teams, ambassadors, donations, outreach, do_not_text: [] as Row[], message_templates };
}
