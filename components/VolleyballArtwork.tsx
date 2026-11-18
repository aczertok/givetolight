/** Event illustration with the flyer palette. No invented event date or location. */
export default function VolleyballArtwork() {
  const netLines = Array.from({length:13},(_,i)=> i*33+336);
  const netRows = Array.from({length:6},(_,i)=> i*27+204);
  return <svg className="vf-illustration" viewBox="0 0 800 470" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="vf-sky" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#8e1230"/><stop offset=".6" stopColor="#5e0b30"/><stop offset="1" stopColor="#270c24"/></linearGradient>
      <radialGradient id="vf-glow" cx=".63" cy=".43" r=".73"><stop stopColor="#ff7f31" stopOpacity=".8"/><stop offset=".35" stopColor="#c1313b" stopOpacity=".45"/><stop offset="1" stopColor="#691232" stopOpacity="0"/></radialGradient>
      <radialGradient id="vf-ball-g" cx=".35" cy=".2" r=".8"><stop stopColor="#fff4c9"/><stop offset=".43" stopColor="#ffcc33"/><stop offset="1" stopColor="#d05d0f"/></radialGradient>
      <linearGradient id="vf-shirt" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#331c39"/><stop offset=".55" stopColor="#111e39"/><stop offset="1" stopColor="#071329"/></linearGradient>
      <linearGradient id="vf-skin" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffbb7c"/><stop offset=".7" stopColor="#e47633"/><stop offset="1" stopColor="#9f3e25"/></linearGradient>
      <linearGradient id="vf-steak" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#bc481c"/><stop offset=".5" stopColor="#732b1f"/><stop offset="1" stopColor="#291a1b"/></linearGradient>
      <linearGradient id="vf-fire" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#fff1aa"/><stop offset=".5" stopColor="#ffc237"/><stop offset="1" stopColor="#df451f"/></linearGradient>
      <filter id="vf-bloom" x="-70%" y="-70%" width="240%" height="240%"><feGaussianBlur stdDeviation="16"/></filter>
      <filter id="vf-smallglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
    </defs>
    <rect width="800" height="470" fill="url(#vf-sky)" opacity=".1"/>
    <ellipse cx="560" cy="185" rx="320" ry="190" fill="url(#vf-glow)"/>
    <g opacity=".56"><path d="M115 410Q362 6 726 68" stroke="#ff9e38" strokeWidth="11" fill="none"/><path d="M125 420Q372 38 748 94" stroke="#ffc342" strokeWidth="3" fill="none"/><path d="M200 475Q500 65 801 170" stroke="#ee4e2b" strokeWidth="9" fill="none"/></g>
    <g stroke="#ffb46c" strokeWidth="1.5" opacity=".35">
      {netLines.map(x=><line key={x} x1={x} y1={193} x2={x+6} y2={397}/>)}
      {netRows.map(y=><line key={y} x1="328" y1={y} x2="788" y2={y+3}/>)}
      <path d="M325 193H800" stroke="#fff1d8" strokeWidth="6"/>
    </g>
    <g transform="translate(602 63) rotate(15)">
      <circle r="59" fill="url(#vf-ball-g)" stroke="#fff5d5" strokeWidth="6"/>
      <g fill="none" stroke="#182d70" strokeWidth="8"><path d="M-54 -8Q-9 -23 12 -57"/><path d="M-30 49Q-8 1 56 -6"/><path d="M0 59Q5 8 -51 -29"/></g>
      <g fill="none" stroke="#faf1dd" strokeWidth="4"><path d="M-47 27Q-18 10 -8 -52"/><path d="M24 -49Q10 -9 49 32"/></g>
      <ellipse cx="-15" cy="-25" rx="18" ry="10" fill="#fff9d6" opacity=".4"/>
    </g>
    <g transform="translate(285 104)">
      <path d="M9 258L-68 421L22 430L79 298Z" fill="#20182f"/>
      <path d="M105 263L127 430L217 430L178 279Z" fill="#211429"/>
      <path d="M16 123Q-6 80 26 44Q65 22 100 46Q132 74 104 111L106 154L21 160Z" fill="url(#vf-skin)" stroke="#ad532f" strokeWidth="3"/>
      <path d="M-1 88Q-6 44 24 26Q61 6 105 35Q93 49 73 44Q36 50 14 77Z" fill="#231725"/>
      <path d="M17 108Q64 96 105 107L135 146L217 181L203 228L155 220L137 292L-39 290L-26 190L-73 217L-107 185L-42 130Z" fill="url(#vf-shirt)" stroke="#5c4460" strokeWidth="4"/>
      <path d="M-33 145L-53 177L-36 216L-19 199Z" fill="#f8d7b0"/>
      <path d="M150 168L177 188L201 187L199 211L166 206Z" fill="#f8d7b0"/>
      <path d="M11 123L30 137L16 272L-2 285L-15 185Z" fill="#f2d0aa" opacity=".8"/>
      <path d="M111 132L122 161L137 270L117 282L107 170Z" fill="#efd7bd" opacity=".8"/>
      <path d="M-63 129Q-105 65 -113 4L-72 -10Q-65 61 -23 113Z" fill="url(#vf-skin)"/>
      <path d="M-115 13Q-151 -14 -142 -45L-127 -56L-126 -76Q-124 -88 -115 -80L-112 -59L-100 -84Q-92 -91 -89 -81L-103 -45L-81 -19Z" fill="url(#vf-skin)"/>
      <path d="M188 183Q249 171 260 132L289 147Q272 214 204 228Z" fill="url(#vf-skin)"/>
      <path d="M278 145L302 112L322 121L304 158Z" fill="url(#vf-skin)"/>
      <path d="M-37 290L139 290" stroke="#f4b24c" strokeWidth="6" opacity=".72"/>
      <g transform="translate(27 179)">
        <path d="M0 45Q51 51 99 42" stroke="#e1e1eb" strokeWidth="1.8" fill="none"/>
        <path d="M43 37L39 4L50 -1L58 38" stroke="#e7ebf3" strokeWidth="3" fill="none"/>
        <path d="M36 6L45 -4L55 5" fill="none" stroke="#e7ebf3" strokeWidth="3"/>
        <text x="48" y="60" textAnchor="middle" fontSize="9" fill="#fff" letterSpacing="1.2" fontWeight="800">THE LIGHTHOUSE</text>
      </g>
    </g>
    <g transform="translate(555 325)">
      <ellipse cx="105" cy="95" rx="165" ry="48" fill="#0c101b" opacity=".88"/>
      <path d="M-48 70Q20 30 65 70T170 66T290 65" fill="none" stroke="#ff8935" strokeWidth="16" opacity=".7" filter="url(#vf-bloom)"/>
      <g fill="url(#vf-fire)"><path d="M18 85Q0 40 31 12Q19 49 52 37Q65 14 63 -15Q105 36 74 87Z"/><path d="M128 85Q91 30 137 -8Q122 35 165 44Q192 11 187 2Q213 50 185 87Z"/><path d="M218 85Q198 43 232 9Q223 49 259 60L259 86Z"/></g>
      <ellipse cx="107" cy="90" rx="133" ry="34" fill="#211820" stroke="#a94722" strokeWidth="6"/>
      <path d="M0 80Q40 31 95 70Q142 30 215 74Q238 101 202 112Q148 134 95 109Q35 136 0 111Z" fill="url(#vf-steak)" stroke="#e57c32" strokeWidth="5"/>
      <g stroke="#281924" strokeWidth="7" opacity=".8"><path d="M22 77L35 119M63 64L82 121M104 65L124 119M145 66L165 115M185 72L197 103"/></g>
      <path d="M20 72Q110 39 201 76" stroke="#facf81" strokeWidth="3" fill="none" opacity=".8"/>
      <path d="M-19 132H251" stroke="#ffc369" strokeWidth="2" opacity=".65"/>
    </g>
    <g transform="translate(736 210) rotate(23)" opacity=".8">
      <path d="M0 15Q40 -30 59 8Q78 49 51 73Q30 99 4 73Q-23 48 0 15Z" fill="#e28b39" stroke="#ffc469" strokeWidth="3"/>
      <circle cx="31" cy="37" r="23" fill="#6b1835"/>
      <path d="M28 15L35 -65L49 -65L46 18Z" fill="#c77c32" stroke="#ffd37c" strokeWidth="2"/>
      <g stroke="#ffca67" strokeWidth=".8"><path d="M22 18L32 -60M27 22L36 -60M32 18L40 -60M37 19L44 -60"/></g>
    </g>
    <g fill="#ffda90" opacity=".9">{[[99,58,2],[203,53,4],[754,44,3],[700,135,2],[103,320,3],[484,44,2],[758,278,2]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r}/>)}</g>
  </svg>;
}
