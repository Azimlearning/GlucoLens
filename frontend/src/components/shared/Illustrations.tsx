/* GlucoLens SVG illustrations — geometric, palette-controlled, no external assets */

export function HeroIllo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 560 480"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="A hand scanning a plate of nasi lemak with a phone"
    >
      <defs>
        <pattern id="grain-h" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.4" fill="#1A1614" opacity="0.07" />
        </pattern>
        <linearGradient id="rim" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#E2B469" />
          <stop offset="1" stopColor="#C8893A" />
        </linearGradient>
      </defs>
      {/* background blob */}
      <path d="M40 280 C 40 150, 180 60, 320 70 C 460 80, 540 180, 520 300 C 500 420, 360 460, 240 440 C 120 420, 40 410, 40 280 Z" fill="#F2DDB1" />
      <path d="M40 280 C 40 150, 180 60, 320 70 C 460 80, 540 180, 520 300 C 500 420, 360 460, 240 440 C 120 420, 40 410, 40 280 Z" fill="url(#grain-h)" />
      {/* plate */}
      <ellipse cx="280" cy="320" rx="190" ry="62" fill="#2D5F3F" />
      <ellipse cx="280" cy="315" rx="178" ry="54" fill="#3B7A52" />
      {/* rice mound */}
      <ellipse cx="260" cy="300" rx="78" ry="34" fill="#FBF8F3" />
      <ellipse cx="260" cy="298" rx="68" ry="26" fill="#FFFDF8" />
      {/* egg */}
      <ellipse cx="330" cy="310" rx="34" ry="20" fill="#FFFDF8" />
      <circle cx="330" cy="308" r="11" fill="#E2B469" />
      <circle cx="328" cy="306" r="4" fill="#F2DDB1" />
      {/* sambal */}
      <path d="M195 308 C 200 290, 230 290, 240 308 C 245 322, 215 326, 195 318 Z" fill="#A33B2A" />
      <path d="M205 304 C 213 300, 225 302, 230 310" stroke="#82261A" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* peanuts */}
      <circle cx="208" cy="328" r="4" fill="#B7791F" />
      <circle cx="220" cy="332" r="3.5" fill="#B7791F" />
      <circle cx="230" cy="328" r="4" fill="#B7791F" />
      {/* cucumber */}
      <ellipse cx="282" cy="338" rx="14" ry="5" fill="#5B8A4D" />
      <ellipse cx="282" cy="338" rx="9" ry="3" fill="#A7C99B" />
      {/* phone */}
      <g transform="rotate(-12 360 200)">
        <rect x="300" y="100" width="140" height="240" rx="22" fill="#1A1614" />
        <rect x="310" y="112" width="120" height="216" rx="14" fill="#FBF8F3" />
        {/* scan overlay */}
        <rect x="324" y="170" width="92" height="92" rx="10" fill="none" stroke="#C8893A" strokeWidth="2.5" strokeDasharray="14 8" />
        <line x1="324" y1="216" x2="416" y2="216" stroke="#C8893A" strokeWidth="2" />
        {/* mini plate inside phone */}
        <ellipse cx="370" cy="232" rx="36" ry="12" fill="#2D5F3F" />
        <circle cx="365" cy="226" r="10" fill="#FFFDF8" />
        <circle cx="378" cy="230" r="5" fill="#A33B2A" />
        {/* score chip */}
        <rect x="320" y="284" width="100" height="22" rx="11" fill="#D8E4D6" />
        <circle cx="332" cy="295" r="4" fill="#2D5F3F" />
        <text x="342" y="299" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="700" fill="#2D5F3F">GOOD · 7.2</text>
      </g>
      {/* hand */}
      <g>
        <path d="M260 360 C 240 380, 240 420, 280 430 L 420 430 C 460 430, 470 410, 460 380 L 440 340 C 430 322, 410 322, 400 340 L 395 360 L 350 350 L 320 348 L 290 354 Z" fill="#E2B469" />
        <path d="M260 360 C 240 380, 240 420, 280 430 L 420 430 C 460 430, 470 410, 460 380 L 440 340 C 430 322, 410 322, 400 340 L 395 360 L 350 350 L 320 348 L 290 354 Z" fill="url(#grain-h)" />
        <rect x="240" y="410" width="60" height="34" rx="6" fill="#1A1614" />
      </g>
      {/* sparkles */}
      <g stroke="#C8893A" strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <line x1="220" y1="160" x2="232" y2="170" />
        <line x1="468" y1="140" x2="456" y2="152" />
        <line x1="500" y1="240" x2="486" y2="244" />
      </g>
    </svg>
  )
}

export function LoginIllo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 500 600"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Still life with breakfast and a glucose meter"
    >
      <defs>
        <pattern id="grain-l" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.4" fill="#1A1614" opacity="0.06" />
        </pattern>
      </defs>
      {/* table */}
      <rect x="0" y="0" width="500" height="600" fill="#F2DDB1" />
      <rect x="0" y="0" width="500" height="600" fill="url(#grain-l)" />
      <ellipse cx="250" cy="540" rx="240" ry="40" fill="#E2B469" opacity="0.5" />
      {/* teh tarik cup */}
      <g transform="translate(70 250)">
        <ellipse cx="60" cy="120" rx="58" ry="10" fill="#1A1614" opacity="0.18" />
        <path d="M10 30 L20 110 L100 110 L110 30 Z" fill="#FFFDF8" />
        <ellipse cx="60" cy="30" rx="50" ry="10" fill="#A8702A" />
        <ellipse cx="60" cy="28" rx="46" ry="8" fill="#C8893A" />
        <path d="M40 10 C 36 0, 44 -10, 40 -20" fill="none" stroke="#8E8470" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        <path d="M60 6 C 56 -4, 64 -14, 60 -24" fill="none" stroke="#8E8470" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        <path d="M80 10 C 76 0, 84 -10, 80 -20" fill="none" stroke="#8E8470" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
      </g>
      {/* plate with roti canai */}
      <g transform="translate(220 300)">
        <ellipse cx="120" cy="120" rx="140" ry="34" fill="#1A1614" opacity="0.18" />
        <ellipse cx="120" cy="110" rx="130" ry="26" fill="#FFFDF8" />
        <ellipse cx="120" cy="106" rx="120" ry="22" fill="#FBF8F3" />
        <path d="M50 100 C 70 80, 130 78, 180 90 C 200 96, 195 110, 175 116 C 130 122, 70 118, 50 110 Z" fill="#E2B469" />
        <path d="M50 100 C 70 80, 130 78, 180 90 C 200 96, 195 110, 175 116 C 130 122, 70 118, 50 110 Z" fill="url(#grain-l)" />
        <path d="M70 95 C 100 92, 150 92, 175 100" stroke="#A8702A" strokeWidth="1.5" fill="none" opacity="0.6" />
        <path d="M60 105 C 100 102, 160 102, 185 108" stroke="#A8702A" strokeWidth="1.5" fill="none" opacity="0.6" />
      </g>
      {/* glucose meter */}
      <g transform="translate(110 80)">
        <rect x="0" y="0" width="160" height="220" rx="20" fill="#1A1614" />
        <rect x="14" y="20" width="132" height="90" rx="6" fill="#D8E4D6" />
        <text x="80" y="60" textAnchor="middle" fontFamily="General Sans, sans-serif" fontSize="36" fontWeight="700" fill="#2D5F3F">6.4</text>
        <text x="80" y="84" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="11" fontWeight="600" fill="#2D5F3F" letterSpacing="0.1em">mmol/L</text>
        <text x="80" y="100" textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="9" fill="#5E5849">FASTING</text>
        <circle cx="40" cy="150" r="14" fill="#3D3930" />
        <circle cx="80" cy="150" r="14" fill="#C8893A" />
        <circle cx="120" cy="150" r="14" fill="#3D3930" />
        <rect x="65" y="190" width="30" height="6" rx="2" fill="#3D3930" />
      </g>
      {/* test strip */}
      <g transform="translate(280 220) rotate(20)">
        <rect x="0" y="0" width="60" height="14" rx="2" fill="#FFFDF8" stroke="#1A1614" strokeWidth="1" />
        <rect x="2" y="2" width="14" height="10" fill="#C8893A" />
      </g>
      {/* pandan leaf */}
      <path d="M380 90 C 420 110, 440 160, 420 200" stroke="#2D5F3F" strokeWidth="14" fill="none" strokeLinecap="round" opacity="0.5" />
      <path d="M380 90 C 420 110, 440 160, 420 200" stroke="#3B7A52" strokeWidth="6" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function Step1Illo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="100" cy="100" r="86" fill="#F2DDB1" />
      <rect x="60" y="70" width="80" height="60" rx="10" fill="#1A1614" />
      <rect x="68" y="78" width="64" height="44" rx="5" fill="#FBF8F3" />
      <circle cx="100" cy="100" r="14" fill="#C8893A" />
      <circle cx="100" cy="100" r="7" fill="#FBF8F3" />
      <rect x="118" y="62" width="14" height="10" rx="2" fill="#1A1614" />
      <line x1="40" y1="155" x2="160" y2="155" stroke="#1A1614" strokeWidth="2" strokeLinecap="round" />
      <circle cx="48" cy="155" r="3" fill="#A33B2A" />
    </svg>
  )
}

export function Step2Illo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="100" cy="100" r="86" fill="#CFE0DE" />
      <line x1="50" y1="60" x2="100" y2="100" stroke="#2D6A6A" strokeWidth="2" />
      <line x1="150" y1="60" x2="100" y2="100" stroke="#2D6A6A" strokeWidth="2" />
      <line x1="60" y1="130" x2="100" y2="100" stroke="#2D6A6A" strokeWidth="2" />
      <line x1="140" y1="130" x2="100" y2="100" stroke="#2D6A6A" strokeWidth="2" />
      <line x1="100" y1="150" x2="100" y2="100" stroke="#2D6A6A" strokeWidth="2" />
      <line x1="100" y1="50" x2="100" y2="100" stroke="#2D6A6A" strokeWidth="2" />
      <circle cx="50" cy="60" r="9" fill="#C8893A" />
      <circle cx="150" cy="60" r="9" fill="#2D5F3F" />
      <circle cx="60" cy="130" r="9" fill="#A33B2A" />
      <circle cx="140" cy="130" r="9" fill="#6B3F5C" />
      <circle cx="100" cy="150" r="9" fill="#B7791F" />
      <circle cx="100" cy="50" r="9" fill="#2D6A6A" />
      <circle cx="100" cy="100" r="14" fill="#1A1614" />
      <circle cx="100" cy="100" r="5" fill="#FBF8F3" />
    </svg>
  )
}

export function Step3Illo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="100" cy="100" r="86" fill="#D8E4D6" />
      <rect x="55" y="55" width="90" height="100" rx="8" fill="#FFFDF8" stroke="#1A1614" strokeWidth="2" />
      <line x1="65" y1="72" x2="120" y2="72" stroke="#1A1614" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="65" y1="84" x2="110" y2="84" stroke="#8E8470" strokeWidth="2" strokeLinecap="round" />
      <polyline points="65,130 78,115 92,125 106,100 120,108 134,98" fill="none" stroke="#C8893A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="134" cy="98" r="4" fill="#C8893A" />
      <line x1="65" y1="140" x2="135" y2="140" stroke="#E8E2D5" strokeWidth="1" />
    </svg>
  )
}

const AGENT_ICON_PATHS: Record<string, JSX.Element> = {
  vision: (
    <>
      <rect x="6" y="10" width="28" height="20" rx="3" fill="#1A1614" />
      <circle cx="20" cy="20" r="6" fill="#C8893A" />
      <circle cx="20" cy="20" r="3" fill="#FBF8F3" />
      <rect x="22" y="7" width="6" height="4" fill="#1A1614" />
    </>
  ),
  nutrition: (
    <>
      <rect x="9" y="14" width="22" height="16" rx="3" fill="#2D5F3F" />
      <line x1="13" y1="18" x2="27" y2="18" stroke="#FBF8F3" strokeWidth="1.5" />
      <line x1="13" y1="22" x2="22" y2="22" stroke="#FBF8F3" strokeWidth="1.5" />
      <line x1="13" y1="26" x2="25" y2="26" stroke="#FBF8F3" strokeWidth="1.5" />
    </>
  ),
  glucose: (
    <>
      <polyline points="6,28 12,22 18,24 24,16 30,20 34,12" fill="none" stroke="#C8893A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="34" cy="12" r="2.5" fill="#C8893A" />
    </>
  ),
  clinical: (
    <>
      <path d="M14 8v8a6 6 0 0 0 12 0V8" fill="none" stroke="#1A1614" strokeWidth="2" />
      <circle cx="14" cy="8" r="1.8" fill="#1A1614" />
      <circle cx="26" cy="8" r="1.8" fill="#1A1614" />
      <circle cx="20" cy="24" r="6" fill="none" stroke="#1A1614" strokeWidth="2" />
      <circle cx="20" cy="24" r="2" fill="#A33B2A" />
    </>
  ),
  misinfo: (
    <>
      <circle cx="17" cy="18" r="9" fill="none" stroke="#6B3F5C" strokeWidth="2.2" />
      <line x1="24" y1="25" x2="31" y2="32" stroke="#6B3F5C" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="13" y1="18" x2="21" y2="18" stroke="#6B3F5C" strokeWidth="2" />
    </>
  ),
  drug: (
    <>
      <rect x="10" y="12" width="20" height="18" rx="9" fill="#2D6A6A" transform="rotate(-30 20 21)" />
      <line x1="13" y1="21" x2="27" y2="21" stroke="#FBF8F3" strokeWidth="2" transform="rotate(-30 20 21)" />
    </>
  ),
  alert: (
    <>
      <path d="M20 8 L32 28 L8 28 Z" fill="#B7791F" />
      <line x1="20" y1="15" x2="20" y2="22" stroke="#FBF8F3" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="20" cy="25.5" r="1.4" fill="#FBF8F3" />
    </>
  ),
  dashboard: (
    <>
      <rect x="8" y="10" width="8" height="20" fill="#2D5F3F" />
      <rect x="18" y="16" width="6" height="14" fill="#C8893A" />
      <rect x="26" y="6" width="6" height="24" fill="#1A1614" />
    </>
  ),
  report: (
    <>
      <rect x="11" y="7" width="18" height="26" rx="2" fill="#FFFDF8" stroke="#1A1614" strokeWidth="1.6" />
      <line x1="14" y1="13" x2="26" y2="13" stroke="#1A1614" strokeWidth="1.6" />
      <line x1="14" y1="17" x2="22" y2="17" stroke="#8E8470" strokeWidth="1.4" />
      <polyline points="14,27 18,23 22,25 26,21" fill="none" stroke="#C8893A" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
}

export function AgentIcon({
  agent,
  className = "",
}: {
  agent: keyof typeof AGENT_ICON_PATHS
  className?: string
}) {
  return (
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" className={className}>
      {AGENT_ICON_PATHS[agent] ?? null}
    </svg>
  )
}

export function DotGrid({ className = "" }: { className?: string }) {
  return (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <pattern id="dg" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="#1A1614" opacity="0.07" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dg)" />
    </svg>
  )
}
