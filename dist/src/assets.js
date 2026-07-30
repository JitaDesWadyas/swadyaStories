export const STAGE_WIDTH = 1600;
export const STAGE_HEIGHT = 900;

const ink = 'currentColor';
const accent = 'var(--asset-accent, #fbbf24)';
const danger = 'var(--asset-danger, #b91c1c)';

export const BUILTIN_ASSETS = [
  {
    key: 'hero', name: 'Eroe', category: 'Personaggi', w: 170, h: 260, role: 'hero', shortcut: '1',
    svg: `<g fill="none" stroke="${ink}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="85" cy="54" r="34" fill="#f8ead0"/>
      <path d="M47 48 Q85 4 123 48 L112 33 L99 45 L85 25 L69 45 L56 33 Z" fill="${accent}"/>
      <path d="M85 88 L85 178 M85 112 L42 142 M85 112 L126 139 M85 178 L52 237 M85 178 L119 237"/>
      <path d="M38 139 L20 230 M20 230 L35 216"/>
      <path d="M125 139 L151 112 M151 112 L160 122 M151 112 L142 102"/>
      <path d="M65 99 Q85 115 105 99" stroke-width="7"/>
    </g>`
  },
  {
    key: 'villager', name: 'Paesano', category: 'Personaggi', w: 140, h: 230, role: 'villager',
    svg: `<g fill="none" stroke="${ink}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="70" cy="45" r="31" fill="#f8ead0"/>
      <path d="M70 76 L70 157 M70 101 L30 133 M70 101 L111 131 M70 157 L39 214 M70 157 L105 214"/>
      <path d="M48 20 Q70 2 92 20" fill="${accent}"/>
      <circle cx="59" cy="44" r="2" fill="${ink}"/><circle cx="81" cy="44" r="2" fill="${ink}"/>
      <path d="M58 59 Q70 66 82 59" stroke-width="6"/>
    </g>`
  },
  {
    key: 'villager2', name: 'Paesana', category: 'Personaggi', w: 140, h: 230, role: 'villager',
    svg: `<g fill="none" stroke="${ink}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="70" cy="45" r="31" fill="#f8ead0"/>
      <path d="M70 76 L70 146 M70 101 L31 132 M70 101 L109 132 M70 146 L36 213 M70 146 L104 213"/>
      <path d="M44 22 Q70 -2 96 22 Q91 74 70 78 Q49 74 44 22" fill="${accent}"/>
      <circle cx="59" cy="44" r="2" fill="${ink}"/><circle cx="81" cy="44" r="2" fill="${ink}"/>
      <path d="M58 59 Q70 66 82 59" stroke-width="6"/>
    </g>`
  },
  {
    key: 'merchant', name: 'Oste', category: 'Personaggi', w: 170, h: 240, role: 'villager',
    svg: `<g fill="none" stroke="${ink}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="85" cy="45" r="32" fill="#f8ead0"/>
      <path d="M85 77 L85 157 M85 104 L40 137 M85 104 L129 137 M85 157 L51 220 M85 157 L118 220"/>
      <path d="M48 48 Q85 88 122 48 Q112 92 85 91 Q58 92 48 48" fill="${accent}"/>
      <path d="M62 38 Q85 28 108 38" stroke-width="7"/>
      <path d="M47 92 Q85 117 123 92 L115 161 L55 161 Z" fill="#fff7e7"/>
    </g>`
  },
  {
    key: 'dragon', name: 'Drago', category: 'Mostri', w: 470, h: 330, role: 'dragon', shortcut: 'D',
    svg: `<g fill="none" stroke="${ink}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
      <path d="M80 245 Q45 170 105 132 Q155 101 206 130 Q250 79 326 105 Q405 130 390 205 Q380 257 313 269 Q207 293 80 245Z" fill="${accent}"/>
      <path d="M112 136 Q62 58 164 102 L191 132" fill="${accent}"/>
      <path d="M267 118 Q326 42 358 118" fill="${accent}"/>
      <path d="M352 123 Q427 112 441 170 Q429 205 382 207" fill="${accent}"/>
      <path d="M86 236 Q31 268 18 220 Q44 235 76 210" fill="${accent}"/>
      <path d="M143 260 L119 318 M240 275 L230 323 M330 257 L351 313"/>
      <path d="M112 316 L95 320 M230 322 L213 325 M352 312 L369 319"/>
      <circle cx="405" cy="156" r="6" fill="${danger}"/>
      <path d="M432 176 Q464 165 458 195 Q444 184 426 192" fill="${danger}"/>
      <path d="M205 130 L227 91 L246 132 M273 116 L296 76 L313 119" fill="${accent}"/>
    </g>`
  },
  {
    key: 'slime', name: 'Mostriciattolo', category: 'Mostri', w: 170, h: 130,
    svg: `<g fill="none" stroke="${ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 109 Q20 45 62 28 Q95 7 126 35 Q150 58 148 110 Z" fill="${accent}"/>
      <circle cx="64" cy="74" r="6" fill="${ink}"/><circle cx="108" cy="74" r="6" fill="${ink}"/>
      <path d="M65 98 Q86 84 108 98"/>
    </g>`
  },
  {
    key: 'tavern', name: 'Taverna interna', category: 'Luoghi', w: 1120, h: 610, role: 'tavern',
    svg: `<g fill="none" stroke="${ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
      <rect x="10" y="10" width="1100" height="590" rx="12" fill="#f4dfb9"/>
      <path d="M10 430 H1110 M160 10 V430 M960 10 V430"/>
      <rect x="470" y="300" width="180" height="300" fill="#8b5e34"/>
      <path d="M494 325 H626 M560 300 V600"/>
      <circle cx="615" cy="450" r="9" fill="${accent}"/>
      <rect x="80" y="150" width="210" height="135" fill="#d8c29a"/>
      <path d="M80 195 H290 M150 150 V285 M220 150 V285"/>
      <rect x="810" y="130" width="205" height="155" fill="#d8c29a"/>
      <path d="M810 185 H1015 M878 130 V285 M946 130 V285"/>
      <path d="M330 520 H790 M360 476 H760 M390 476 V565 M730 476 V565"/>
      <path d="M65 70 H305 M795 70 H1035" stroke="${accent}" stroke-width="18"/>
      <path d="M10 430 Q250 400 500 430 T1110 430" stroke-width="6"/>
    </g>`
  },
  {
    key: 'roof', name: 'Tetto taverna', category: 'Luoghi', w: 1180, h: 340, role: 'roof', shortcut: 'T',
    svg: `<g fill="none" stroke="${ink}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round">
      <path d="M35 300 L590 25 L1145 300 Z" fill="#9b4e36"/>
      <path d="M115 300 L590 75 L1065 300"/>
      <path d="M260 218 H920 M395 150 H785" stroke-width="7"/>
      <rect x="760" y="72" width="95" height="140" fill="#71533d"/>
      <path d="M745 72 H870"/>
    </g>`
  },
  {
    key: 'castle', name: 'Castello', category: 'Luoghi', w: 560, h: 460,
    svg: `<g fill="none" stroke="${ink}" stroke-width="11" stroke-linejoin="round">
      <path d="M80 430 V150 H160 V95 H225 V150 H335 V95 H400 V150 H480 V430 Z" fill="#d7d1c4"/>
      <path d="M80 150 H480 M225 150 V430 M335 150 V430"/>
      <path d="M260 430 V310 Q280 260 300 310 V430" fill="#6f5847"/>
      <path d="M104 95 V44 L139 62 L160 44 V95 M375 95 V44 L410 62 L431 44 V95" fill="${accent}"/>
      <rect x="125" y="215" width="45" height="65" fill="#b8d7df"/>
      <rect x="390" y="215" width="45" height="65" fill="#b8d7df"/>
    </g>`
  },
  {
    key: 'forest', name: 'Bosco', category: 'Luoghi', w: 760, h: 430,
    svg: `<g fill="none" stroke="${ink}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
      <g fill="#5b8a55"><path d="M110 390 V195 M55 245 L110 55 L170 245 Z"/><path d="M265 390 V220 M205 260 L265 75 L325 260 Z"/><path d="M430 390 V185 M360 235 L430 35 L500 235 Z"/><path d="M620 390 V225 M552 270 L620 80 L690 270 Z"/></g>
      <path d="M20 390 Q180 350 360 390 T740 390"/>
    </g>`
  },
  {
    key: 'mountains', name: 'Montagne', category: 'Luoghi', w: 900, h: 390,
    svg: `<g fill="none" stroke="${ink}" stroke-width="10" stroke-linejoin="round">
      <path d="M20 370 L235 105 L360 245 L525 45 L880 370 Z" fill="#b8c2c4"/>
      <path d="M165 190 L235 105 L292 185 L250 170 L225 190 L205 166 Z" fill="#fff"/>
      <path d="M438 150 L525 45 L626 160 L558 132 L525 165 L490 126 Z" fill="#fff"/>
    </g>`
  },
  {
    key: 'table', name: 'Tavolo', category: 'Oggetti', w: 280, h: 150,
    svg: `<g fill="none" stroke="${ink}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round">
      <rect x="10" y="20" width="260" height="65" rx="10" fill="#9a6337"/>
      <path d="M45 85 L35 145 M235 85 L245 145"/>
      <path d="M75 53 H205" stroke="${accent}" stroke-width="7"/>
    </g>`
  },
  {
    key: 'barrel', name: 'Barile', category: 'Oggetti', w: 150, h: 190,
    svg: `<g fill="none" stroke="${ink}" stroke-width="10" stroke-linejoin="round">
      <path d="M35 15 Q75 0 115 15 Q140 95 115 175 Q75 190 35 175 Q10 95 35 15Z" fill="#9a6337"/>
      <path d="M24 55 H126 M20 130 H130 M75 8 V182"/>
    </g>`
  },
  {
    key: 'sword', name: 'Spada', category: 'Oggetti', w: 110, h: 280,
    svg: `<g fill="none" stroke="${ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
      <path d="M55 18 L78 178 L55 220 L32 178 Z" fill="#d7dde0"/>
      <path d="M20 210 H90 M55 210 V270"/>
      <path d="M42 270 H68" stroke="${accent}" stroke-width="16"/>
    </g>`
  },
  {
    key: 'shield', name: 'Scudo', category: 'Oggetti', w: 180, h: 220,
    svg: `<g fill="none" stroke="${ink}" stroke-width="11" stroke-linejoin="round">
      <path d="M20 25 Q90 5 160 25 V100 Q150 175 90 205 Q30 175 20 100 Z" fill="${accent}"/>
      <path d="M90 28 V185 M35 92 H145"/>
    </g>`
  },
  {
    key: 'door', name: 'Porta', category: 'Oggetti', w: 210, h: 330,
    svg: `<g fill="none" stroke="${ink}" stroke-width="11" stroke-linejoin="round">
      <rect x="12" y="12" width="186" height="306" fill="#8f6038"/>
      <path d="M45 12 V318 M164 12 V318 M12 100 H198 M12 220 H198"/>
      <circle cx="155" cy="170" r="10" fill="${accent}"/>
    </g>`
  },
  {
    key: 'fire', name: 'Fuoco', category: 'Effetti', w: 190, h: 240, role: 'fire', shortcut: 'F',
    svg: `<g fill="none" stroke="${ink}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">
      <path d="M95 220 Q20 200 36 127 Q45 91 81 54 Q79 105 106 114 Q132 82 126 28 Q183 85 166 153 Q156 208 95 220Z" fill="${accent}"/>
      <path d="M94 200 Q64 188 70 154 Q74 134 97 115 Q94 147 114 151 Q132 140 134 119 Q151 155 137 181 Q123 204 94 200Z" fill="${danger}"/>
    </g>`
  },
  {
    key: 'smoke', name: 'Fumo', category: 'Effetti', w: 260, h: 260,
    svg: `<g fill="#bfc3c7" stroke="${ink}" stroke-width="8">
      <circle cx="76" cy="190" r="48"/><circle cx="130" cy="162" r="58"/><circle cx="181" cy="195" r="45"/>
      <circle cx="108" cy="108" r="45"/><circle cx="165" cy="82" r="38"/><circle cx="125" cy="42" r="28"/>
    </g>`
  },
  {
    key: 'blood', name: 'Macchia', category: 'Effetti', w: 230, h: 120,
    svg: `<g fill="${danger}" stroke="${ink}" stroke-width="7" stroke-linejoin="round">
      <path d="M15 85 Q55 40 95 71 Q125 23 154 67 Q198 48 216 90 Q165 111 110 102 Q57 116 15 85Z"/>
      <circle cx="53" cy="28" r="12"/><circle cx="187" cy="22" r="9"/>
    </g>`
  },
  {
    key: 'impact', name: 'Impatto', category: 'Effetti', w: 260, h: 260,
    svg: `<g fill="${accent}" stroke="${ink}" stroke-width="9" stroke-linejoin="round">
      <path d="M130 8 L155 78 L224 38 L188 105 L252 132 L184 151 L222 222 L153 184 L130 252 L106 183 L37 222 L75 151 L8 130 L76 105 L38 38 L106 78 Z"/>
    </g>`
  },
  {
    key: 'speech', name: 'Fumetto', category: 'Testo', w: 390, h: 220, isTextBubble: true,
    svg: `<g fill="#fffdf7" stroke="${ink}" stroke-width="10" stroke-linejoin="round">
      <rect x="10" y="10" width="370" height="160" rx="40"/>
      <path d="M100 166 L72 210 L150 170"/>
    </g>`
  },
  {
    key: 'arrow', name: 'Freccia', category: 'Segni', w: 280, h: 100,
    svg: `<g fill="none" stroke="${ink}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 50 H250 M205 12 L255 50 L205 88"/>
    </g>`
  },
  {
    key: 'cross', name: 'X', category: 'Segni', w: 180, h: 180,
    svg: `<g fill="none" stroke="${danger}" stroke-width="24" stroke-linecap="round">
      <path d="M20 20 L160 160 M160 20 L20 160"/>
    </g>`
  }
];

export const ASSET_MAP = Object.fromEntries(BUILTIN_ASSETS.map(asset => [asset.key, asset]));

export function assetThumbnail(asset) {
  return `<svg viewBox="0 0 ${asset.w} ${asset.h}" aria-hidden="true">${asset.svg}</svg>`;
}
