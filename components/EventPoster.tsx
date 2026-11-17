/** The big graphic at the top of a campaign page: an evening scene with
 *  the lighthouse, and for the volleyball tournament a net and ball. */
export default function EventPoster({ kind, kicker, title, accent, line, cover }: {
  kind: "volleyball" | "default"; kicker: string; title: string; accent?: string; line?: string | null; cover?: string | null;
}) {
  return (
    <section className={"lp" + (cover ? " lp-photo" : "")}>
      {cover ? <img className="lp-cover" src={cover} alt="" /> : <Scene kind={kind} />}
      <div className="lp-shade" aria-hidden="true" />
      <div className="lc-wrap lp-text">
        <div className="lp-kicker">{kicker}</div>
        <h1>{title}{accent && <> <span>{accent}</span></>}</h1>
        {line && <p>{line}</p>}
      </div>
    </section>
  );
}

function Scene({ kind }: { kind: "volleyball" | "default" }) {
  // Deterministic stars so server and browser draw the same sky.
  const stars = Array.from({ length: 46 }, (_, i) => ({ x: (i * 7919 + 131) % 1600, y: (i * i * 37 + i * 113) % 270, r: i % 5 === 0 ? 1.7 : 1, o: 0.3 + ((i * 7) % 6) / 10 }));
  const bulbs = Array.from({ length: 15 }, (_, i) => {
    const t = i / 14; const x = 560 + t * 1040; const y = 40 + Math.sin(t * Math.PI) * 70;
    return { x, y };
  });
  return (
    <svg className="lp-scene" viewBox="0 0 1600 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="lp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#081330" /><stop offset=".62" stopColor="#14295c" /><stop offset=".86" stopColor="#7a4a5c" /><stop offset="1" stopColor="#e3925a" />
        </linearGradient>
        <linearGradient id="lp-beam" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" stopColor="#ffd47e" stopOpacity=".55" /><stop offset="1" stopColor="#ffd47e" stopOpacity="0" />
        </linearGradient>
        <filter id="lp-soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="14" /></filter>
        <radialGradient id="lp-lamp"><stop offset="0" stopColor="#fff3c8" /><stop offset=".35" stopColor="#ffd47e" stopOpacity=".9" /><stop offset="1" stopColor="#ffd47e" stopOpacity="0" /></radialGradient>
        <radialGradient id="lp-ball" cx=".38" cy=".32" r=".75"><stop offset="0" stopColor="#ffffff" /><stop offset=".7" stopColor="#f3ead6" /><stop offset="1" stopColor="#cdbf9f" /></radialGradient>
        <radialGradient id="lp-bulb"><stop offset="0" stopColor="#fff6d6" /><stop offset=".4" stopColor="#ffd47e" stopOpacity=".8" /><stop offset="1" stopColor="#ffd47e" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="1600" height="520" fill="url(#lp-sky)" />
      {stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />)}

      {/* lighthouse on its rock, beam sweeping left */}
      <g className="lp-beam-g"><path d="M1412 168 L520 60 L520 300 Z" fill="url(#lp-beam)" opacity=".45" filter="url(#lp-soft)" /></g>
      <circle cx="1412" cy="168" r="60" fill="url(#lp-lamp)" />
      <path d="M1330 470 Q1360 420 1412 418 Q1470 420 1510 470 Z" fill="#0b1630" />
      <path d="M1390 420 L1398 196 L1426 196 L1434 420 Z" fill="#e9eef7" />
      <path d="M1394 330 L1430 330 L1432 372 L1392 372 Z M1397 250 L1427 250 L1428 286 L1396 286 Z" fill="#3173b1" />
      <rect x="1392" y="184" width="40" height="14" rx="2" fill="#1c2d55" />
      <rect x="1400" y="160" width="24" height="24" fill="#ffe6a3" />
      <path d="M1396 160 L1412 140 L1428 160 Z" fill="#1c2d55" />

      {kind === "volleyball" ? (
        <>
          {/* string lights */}
          <path d={`M${bulbs.map((b) => `${b.x} ${b.y}`).join(" L")}`} fill="none" stroke="#33467a" strokeWidth="1.6" opacity=".9" />
          {bulbs.map((b, i) => <g key={i}><circle cx={b.x} cy={b.y + 7} r="14" fill="url(#lp-bulb)" /><circle cx={b.x} cy={b.y + 7} r="3.6" fill="#fff1c2" /></g>)}
          {/* sand */}
          <path d="M0 470 Q400 440 800 452 T1600 446 L1600 520 L0 520 Z" fill="#d9a86a" />
          <path d="M0 488 Q500 470 900 482 T1600 476 L1600 520 L0 520 Z" fill="#c8934f" opacity=".8" />
          {/* net */}
          <g>
            <rect x="836" y="300" width="7" height="176" rx="2" fill="#1a2547" />
            <rect x="1196" y="300" width="7" height="176" rx="2" fill="#1a2547" />
            <rect x="840" y="306" width="360" height="9" fill="#f4f1ea" />
            <g stroke="#f4f1ea" strokeWidth="1.3" opacity=".55">
              {Array.from({ length: 19 }, (_, i) => <line key={"v" + i} x1={843 + i * 20} y1="315" x2={843 + i * 20} y2="388" />)}
              {Array.from({ length: 5 }, (_, i) => <line key={"h" + i} x1="843" y1={330 + i * 15} x2="1196" y2={330 + i * 15} />)}
            </g>
            <rect x="840" y="386" width="360" height="4" fill="#f4f1ea" opacity=".8" />
          </g>
          {/* ball and its flight */}
          <path d="M720 420 Q900 120 1080 210" fill="none" stroke="#ffd47e" strokeWidth="3" strokeDasharray="2 14" strokeLinecap="round" opacity=".75" />
          <g className="lp-ball" transform="translate(1092 214)">
            <circle r="40" fill="url(#lp-ball)" />
            <g fill="none" stroke="#1f3b78" strokeWidth="3.2" strokeLinecap="round">
              <path d="M-38 -10 Q-4 -8 14 -36" />
              <path d="M-26 30 Q4 6 38 12" />
              <path d="M2 40 Q-6 6 -26 -30" />
            </g>
            <g fill="none" stroke="#f5b942" strokeWidth="3" strokeLinecap="round" opacity=".9">
              <path d="M-34 4 Q-2 2 20 -30" />
              <path d="M-16 34 Q8 14 36 22" />
            </g>
          </g>
        </>
      ) : (
        <>
          <path d="M0 470 Q300 430 640 455 T1280 448 T1600 452 L1600 520 L0 520 Z" fill="#0d1a3a" />
          <path d="M0 490 Q500 470 900 486 T1600 480 L1600 520 L0 520 Z" fill="#0a1430" />
        </>
      )}
    </svg>
  );
}
