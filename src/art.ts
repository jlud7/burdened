/**
 * Placeholder art, hand-rolled SVG in the concept style: chibi proportions,
 * blank oval eyes, muted earthy palette. Every art id also tries to load
 * `art/<id>.png` (generated via `npm run art`); when the PNG exists it covers
 * the placeholder, otherwise the <img> removes itself and the SVG shows.
 */

const C = {
  ink: '#3a2f25',
  skin: '#e8d5b5',
  hair: '#5a4632',
  leather: '#8a6f4d',
  wood: '#7a5f44',
  steel: '#a8a49a',
  steelDark: '#7d7a72',
  red: '#a04b3b',
  fire: '#c96f3b',
  green: '#7a8450',
  goblin: '#7da05c',
  blue: '#5b6b7a',
  slime: '#6f9fc0',
  gold: '#c9a23f',
  cloth: '#6b7a99',
  night: '#2c3140',
  paper: '#d9cba6',
};

const eyes = (cx1: number, cx2: number, cy: number, r = 5) =>
  `<ellipse cx="${cx1}" cy="${cy}" rx="${r * 0.72}" ry="${r}" fill="#fff" stroke="${C.ink}" stroke-width="1.6"/>
   <ellipse cx="${cx2}" cy="${cy}" rx="${r * 0.72}" ry="${r}" fill="#fff" stroke="${C.ink}" stroke-width="1.6"/>`;

const svg = (body: string) =>
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

// ---- creatures ----

const blob = (color: string) => svg(`
  <path d="M15 78 Q12 48 30 36 Q50 22 70 36 Q88 48 85 78 Q86 86 76 84 Q70 90 60 86 Q50 92 40 86 Q30 90 24 84 Q14 86 15 78 Z"
    fill="${color}" stroke="${C.ink}" stroke-width="2.5"/>
  <ellipse cx="38" cy="58" rx="4" ry="6" fill="#fff" stroke="${C.ink}" stroke-width="1.6"/>
  <ellipse cx="62" cy="58" rx="4" ry="6" fill="#fff" stroke="${C.ink}" stroke-width="1.6"/>
  <circle cx="70" cy="44" r="4" fill="#ffffff55"/>
`);

const biped = (bodyColor: string, skinColor: string, extra = '') => svg(`
  <circle cx="50" cy="34" r="22" fill="${skinColor}" stroke="${C.ink}" stroke-width="2.5"/>
  <path d="M30 26 Q50 6 70 26 Q60 18 50 19 Q40 18 30 26 Z" fill="${C.hair}" stroke="${C.ink}" stroke-width="2"/>
  ${eyes(42, 58, 38)}
  <rect x="34" y="55" width="32" height="32" rx="9" fill="${bodyColor}" stroke="${C.ink}" stroke-width="2.5"/>
  <rect x="40" y="86" width="8" height="9" rx="3" fill="${C.ink}"/>
  <rect x="52" y="86" width="8" height="9" rx="3" fill="${C.ink}"/>
  ${extra}
`);

const beast = (color: string) => svg(`
  <ellipse cx="52" cy="66" rx="32" ry="20" fill="${color}" stroke="${C.ink}" stroke-width="2.5"/>
  <circle cx="26" cy="48" r="16" fill="${color}" stroke="${C.ink}" stroke-width="2.5"/>
  <path d="M16 36 L20 22 L28 34 Z" fill="${color}" stroke="${C.ink}" stroke-width="2"/>
  <path d="M30 34 L36 22 L40 36 Z" fill="${color}" stroke="${C.ink}" stroke-width="2"/>
  ${eyes(21, 31, 48, 4)}
  <rect x="30" y="80" width="7" height="10" rx="3" fill="${C.ink}"/>
  <rect x="64" y="80" width="7" height="10" rx="3" fill="${C.ink}"/>
  <path d="M82 60 Q94 52 90 42" stroke="${C.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>
`);

// ---- item glyphs ----

const sword = (blade: string) => svg(`
  <path d="M50 8 L58 16 L54 64 L46 64 L42 16 Z" fill="${blade}" stroke="${C.ink}" stroke-width="2.5"/>
  <rect x="34" y="62" width="32" height="8" rx="3" fill="${C.wood}" stroke="${C.ink}" stroke-width="2"/>
  <rect x="45" y="70" width="10" height="20" rx="4" fill="${C.leather}" stroke="${C.ink}" stroke-width="2"/>
  <circle cx="50" cy="92" r="5" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>
`);

const shield = (face: string) => svg(`
  <path d="M50 10 Q78 14 80 22 L80 56 Q80 80 50 92 Q20 80 20 56 L20 22 Q22 14 50 10 Z"
    fill="${face}" stroke="${C.ink}" stroke-width="3"/>
  <path d="M50 22 L50 80 M30 46 L70 46" stroke="${C.ink}" stroke-width="2.5" opacity="0.45"/>
  <circle cx="50" cy="46" r="7" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>
`);

const rune = (glow: string, glyph: string) => svg(`
  <path d="M50 8 L82 50 L50 92 L18 50 Z" fill="${C.steelDark}" stroke="${C.ink}" stroke-width="3"/>
  <path d="M50 20 L72 50 L50 80 L28 50 Z" fill="${glow}" opacity="0.9"/>
  <text x="50" y="60" text-anchor="middle" font-size="26" fill="#fff" font-family="Georgia, serif">${glyph}</text>
`);

const badge = (icon: string) => svg(`
  <circle cx="50" cy="50" r="36" fill="${C.leather}" stroke="${C.ink}" stroke-width="3"/>
  <circle cx="50" cy="50" r="28" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>
  ${icon}
`);

const torchG = svg(`
  <rect x="44" y="42" width="12" height="48" rx="4" fill="${C.wood}" stroke="${C.ink}" stroke-width="2.5"/>
  <path d="M50 8 Q66 26 56 40 Q50 46 44 40 Q34 26 50 8 Z" fill="${C.fire}" stroke="${C.ink}" stroke-width="2.5"/>
  <path d="M50 20 Q57 30 50 38 Q44 31 50 20 Z" fill="${C.gold}"/>
`);

const herbsG = (col: string) => svg(`
  <path d="M50 90 L50 50" stroke="${C.green}" stroke-width="4"/>
  <path d="M50 70 Q30 64 28 44 Q48 46 50 64 Z" fill="${col}" stroke="${C.ink}" stroke-width="2"/>
  <path d="M50 60 Q70 54 72 34 Q52 36 50 54 Z" fill="${col}" stroke="${C.ink}" stroke-width="2"/>
  <path d="M50 50 Q48 28 50 16 Q66 28 50 50 Z" fill="${col}" stroke="${C.ink}" stroke-width="2"/>
  <path d="M38 88 Q50 80 62 88" stroke="${C.leather}" stroke-width="5" fill="none"/>
`);

const coinBagG = svg(`
  <path d="M50 26 Q24 38 24 64 Q24 86 50 86 Q76 86 76 64 Q76 38 50 26 Z" fill="${C.leather}" stroke="${C.ink}" stroke-width="3"/>
  <path d="M40 24 Q50 18 60 24 L56 32 Q50 28 44 32 Z" fill="${C.leather}" stroke="${C.ink}" stroke-width="2"/>
  <path d="M40 26 Q50 34 60 26" stroke="${C.ink}" stroke-width="2.5" fill="none"/>
  <text x="50" y="68" text-anchor="middle" font-size="26" fill="${C.gold}" font-family="Georgia, serif" font-weight="bold">$</text>
`);

const chaliceG = svg(`
  <path d="M28 14 L72 14 Q70 44 50 50 Q30 44 28 14 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="3"/>
  <rect x="46" y="50" width="8" height="26" fill="${C.gold}" stroke="${C.ink}" stroke-width="2.5"/>
  <path d="M30 86 Q50 74 70 86 L70 90 L30 90 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2.5"/>
  <circle cx="50" cy="28" r="5" fill="${C.red}" stroke="${C.ink}" stroke-width="1.5"/>
`);

const chestG = svg(`
  <rect x="14" y="42" width="72" height="42" rx="6" fill="${C.wood}" stroke="${C.ink}" stroke-width="3"/>
  <path d="M14 46 Q14 22 50 22 Q86 22 86 46 Z" fill="${C.leather}" stroke="${C.ink}" stroke-width="3"/>
  <rect x="44" y="40" width="12" height="18" rx="3" fill="${C.gold}" stroke="${C.ink}" stroke-width="2.5"/>
  <path d="M14 58 L86 58" stroke="${C.ink}" stroke-width="2" opacity="0.4"/>
`);

const woodG = svg(`
  <rect x="12" y="36" width="76" height="14" rx="7" fill="${C.wood}" stroke="${C.ink}" stroke-width="2.5"/>
  <rect x="12" y="54" width="76" height="14" rx="7" fill="${C.leather}" stroke="${C.ink}" stroke-width="2.5"/>
  <circle cx="20" cy="43" r="5" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.5"/>
  <circle cx="20" cy="61" r="5" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.5"/>
`);

const stoneG = svg(`
  <path d="M22 74 L18 48 L36 32 L66 30 L82 50 L78 74 Z" fill="${C.steel}" stroke="${C.ink}" stroke-width="3"/>
  <path d="M36 32 L44 52 L18 48 M44 52 L78 74 M44 52 L66 30" stroke="${C.ink}" stroke-width="2" opacity="0.4" fill="none"/>
`);

const fireballG = svg(`
  <circle cx="44" cy="56" r="26" fill="${C.fire}" stroke="${C.ink}" stroke-width="3"/>
  <circle cx="44" cy="56" r="13" fill="${C.gold}"/>
  <path d="M66 38 Q84 22 92 12 Q86 30 74 46 Z" fill="${C.fire}" stroke="${C.ink}" stroke-width="2"/>
`);

const arrowG = svg(`
  <path d="M16 84 L76 24" stroke="${C.wood}" stroke-width="5" stroke-linecap="round"/>
  <path d="M76 24 L60 26 L84 8 L82 32 Z" fill="${C.steel}" stroke="${C.ink}" stroke-width="2"/>
  <path d="M16 84 L26 70 M16 84 L30 78" stroke="${C.red}" stroke-width="4" stroke-linecap="round"/>
`);

const junkG = svg(`
  <path d="M24 80 Q18 60 32 56 Q30 40 46 42 Q52 30 64 38 Q78 36 76 52 Q86 60 76 72 L72 82 Z"
    fill="${C.steelDark}" stroke="${C.ink}" stroke-width="3" opacity="0.85"/>
  <path d="M34 64 L66 64 M38 72 L62 72" stroke="${C.ink}" stroke-width="2.5" opacity="0.5"/>
  <text x="50" y="30" text-anchor="middle" font-size="20" fill="${C.ink}" opacity="0.6">✦</text>
`);

const antlers = `<path d="M40 58 Q34 44 24 40 M40 52 Q32 50 28 44 M60 58 Q66 44 76 40 M60 52 Q68 50 72 44"
  stroke="${C.wood}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <circle cx="50" cy="56" r="8" fill="${C.wood}" stroke="${C.ink}" stroke-width="2"/>`;

const bowBadge = `<path d="M36 30 Q62 50 36 70" stroke="${C.wood}" stroke-width="3.5" fill="none"/>
  <path d="M36 30 L36 70" stroke="${C.ink}" stroke-width="1.6"/>
  <path d="M36 50 L66 50 M66 50 L58 44 M66 50 L58 56" stroke="${C.ink}" stroke-width="2.5" fill="none"/>`;

// ---- scenes / buildings ----

const treeScene = svg(`
  <rect x="0" y="74" width="100" height="26" fill="${C.green}" opacity="0.5"/>
  <rect x="30" y="56" width="8" height="24" fill="${C.wood}" stroke="${C.ink}" stroke-width="2"/>
  <circle cx="34" cy="42" r="20" fill="${C.green}" stroke="${C.ink}" stroke-width="2.5"/>
  <rect x="64" y="62" width="7" height="20" fill="${C.wood}" stroke="${C.ink}" stroke-width="2"/>
  <circle cx="67" cy="50" r="15" fill="${C.green}" stroke="${C.ink}" stroke-width="2.5"/>
`);

const towerScene = svg(`
  <rect x="0" y="78" width="100" height="22" fill="${C.steelDark}" opacity="0.4"/>
  <path d="M34 84 L34 28 L40 22 L46 28 L46 20 L54 20 L54 28 L60 22 L66 28 L66 84 Z"
    fill="${C.steel}" stroke="${C.ink}" stroke-width="2.5"/>
  <rect x="45" y="60" width="10" height="24" rx="5" fill="${C.ink}"/>
  <rect x="44" y="38" width="12" height="10" rx="2" fill="${C.night}" stroke="${C.ink}" stroke-width="2"/>
  <path d="M66 50 L82 58 L66 62 Z" fill="${C.red}" stroke="${C.ink}" stroke-width="2"/>
`);

const house = (roof: string, sign: string) => svg(`
  <rect x="22" y="48" width="56" height="38" fill="${C.paper}" stroke="${C.ink}" stroke-width="2.5"/>
  <path d="M14 50 L50 22 L86 50 Z" fill="${roof}" stroke="${C.ink}" stroke-width="2.5"/>
  <rect x="42" y="62" width="16" height="24" rx="2" fill="${C.wood}" stroke="${C.ink}" stroke-width="2"/>
  <text x="50" y="44" text-anchor="middle" font-size="15">${sign}</text>
`);

// ---- the table ----

const ART: Record<string, string> = {
  hero: biped(C.cloth, C.skin),
  side_cleric: biped('#9a8f6a', C.skin, `<path d="M44 62 L56 62 M50 56 L50 72" stroke="${C.gold}" stroke-width="3.5"/>`),
  side_soldier: biped(C.steelDark, C.skin, `<rect x="30" y="58" width="10" height="14" rx="3" fill="${C.steel}" stroke="${C.ink}" stroke-width="2"/>`),
  side_hound: beast('#9a7b52'),
  mule: beast('#8d8378'),

  enemy_slime: blob(C.slime),
  enemy_wolf: beast('#6e655c'),
  enemy_goblin: biped(C.leather, C.goblin),
  enemy_shade: blob(C.night),
  enemy_brute: biped('#5d4a33', C.goblin),
  enemy_treant: svg(`
    <rect x="38" y="40" width="24" height="48" rx="6" fill="${C.wood}" stroke="${C.ink}" stroke-width="3"/>
    <circle cx="50" cy="30" r="22" fill="${C.green}" stroke="${C.ink}" stroke-width="3"/>
    ${eyes(43, 57, 56, 4)}
    <path d="M38 52 Q20 44 16 30 M62 52 Q80 44 84 30" stroke="${C.wood}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="34" cy="22" r="4" fill="${C.red}"/>
  `),

  item_sword: sword(C.steel),
  item_iron_sword: sword('#c4c0b4'),
  item_shield: shield(C.wood),
  item_tower_shield: shield(C.steelDark),
  item_hunter_badge: badge(bowBadge),
  item_deer_badge: badge(antlers),
  item_fire_rune: rune(C.red, '🔥'),
  item_frost_rune: rune(C.slime, '❄'),
  item_torch: torchG,
  item_herbs: herbsG(C.green),
  item_ancient_herbs: herbsG('#5d7a68'),
  item_coin_bag: coinBagG,
  item_chalice: chaliceG,
  item_chest: chestG,
  item_wood: woodG,
  item_stone: stoneG,

  card_strike: sword(C.steel),
  card_heavy_strike: sword('#c4c0b4'),
  card_arrow: arrowG,
  card_defend: shield(C.wood),
  card_bulwark: shield(C.steelDark),
  card_brace: shield(C.steelDark),
  card_bash: shield(C.wood),
  card_fireball: fireballG,
  card_searing: torchG,
  card_frost: rune(C.slime, '❄'),
  card_mend: herbsG(C.green),
  card_minor_heal: svg(`<circle cx="50" cy="50" r="30" fill="${C.paper}" stroke="${C.ink}" stroke-width="3"/>
    <path d="M40 50 L60 50 M50 40 L50 60" stroke="${C.red}" stroke-width="7" stroke-linecap="round"/>`),
  card_smite: svg(`<path d="M56 8 L36 52 L50 52 L42 92 L70 42 L54 42 L66 8 Z" fill="${C.gold}" stroke="${C.ink}" stroke-width="2.5"/>`),
  card_sprint: svg(`<path d="M20 70 Q40 66 44 50 Q48 66 68 70 M30 84 Q50 78 70 84" stroke="${C.ink}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M44 18 Q60 30 56 46 Q48 38 44 18" fill="${C.green}" stroke="${C.ink}" stroke-width="2.5"/>`),
  card_bite: svg(`<path d="M20 40 Q50 20 80 40 L72 60 L64 44 L56 62 L50 46 L44 62 L36 44 L28 60 Z"
    fill="#fff" stroke="${C.ink}" stroke-width="3"/>`),
  card_fetch: svg(`<rect x="30" y="44" width="40" height="12" rx="6" fill="${C.wood}" stroke="${C.ink}" stroke-width="2.5"/>
    <circle cx="26" cy="50" r="9" fill="${C.wood}" stroke="${C.ink}" stroke-width="2.5"/>
    <circle cx="74" cy="50" r="9" fill="${C.wood}" stroke="${C.ink}" stroke-width="2.5"/>`),
  card_junk: junkG,
  card_cower: svg(`<circle cx="50" cy="44" r="22" fill="${C.skin}" stroke="${C.ink}" stroke-width="2.5"/>
    <ellipse cx="42" cy="46" rx="4" ry="7" fill="#fff" stroke="${C.ink}" stroke-width="1.6"/>
    <ellipse cx="58" cy="46" rx="4" ry="7" fill="#fff" stroke="${C.ink}" stroke-width="1.6"/>
    <ellipse cx="50" cy="60" rx="6" ry="8" fill="${C.ink}"/>
    <path d="M24 90 Q30 70 38 72 M76 90 Q70 70 62 72" stroke="${C.ink}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`),

  dest_woods: treeScene,
  dest_dungeon: towerScene,
  bld_blacksmith: house(C.steelDark, '⚒'),
  bld_apothecary: house(C.green, '⚗'),
  bld_watchtower: towerScene,

  // run-summary scenes
  summary_home: svg(`
    <circle cx="78" cy="26" r="14" fill="${C.gold}" stroke="${C.ink}" stroke-width="2.5"/>
    <rect x="0" y="78" width="100" height="22" fill="${C.leather}" opacity="0.45"/>
    <rect x="18" y="34" width="9" height="50" fill="${C.wood}" stroke="${C.ink}" stroke-width="2.5"/>
    <rect x="56" y="34" width="9" height="50" fill="${C.wood}" stroke="${C.ink}" stroke-width="2.5"/>
    <path d="M14 36 Q41 18 68 36 L68 28 Q41 10 14 28 Z" fill="${C.wood}" stroke="${C.ink}" stroke-width="2.5"/>
    <circle cx="41" cy="62" r="9" fill="${C.skin}" stroke="${C.ink}" stroke-width="2"/>
    <rect x="35" y="70" width="12" height="14" rx="4" fill="${C.cloth}" stroke="${C.ink}" stroke-width="2"/>
    <rect x="30" y="68" width="7" height="12" rx="3" fill="${C.leather}" stroke="${C.ink}" stroke-width="2"/>
  `),
  summary_lost: svg(`
    <rect x="0" y="70" width="100" height="30" fill="${C.night}" opacity="0.5"/>
    <circle cx="22" cy="20" r="10" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/>
    <path d="M34 78 Q30 52 50 50 Q72 52 68 78 Q70 84 62 83 L40 83 Q32 84 34 78 Z"
      fill="${C.leather}" stroke="${C.ink}" stroke-width="3" transform="rotate(-14 50 70)"/>
    <path d="M42 60 Q50 54 58 60" stroke="${C.ink}" stroke-width="2.5" fill="none" transform="rotate(-14 50 70)"/>
    <circle cx="74" cy="82" r="4" fill="${C.gold}" stroke="${C.ink}" stroke-width="1.5"/>
    <circle cx="82" cy="76" r="3.4" fill="${C.gold}" stroke="${C.ink}" stroke-width="1.5"/>
    <circle cx="28" cy="84" r="3.4" fill="${C.gold}" stroke="${C.ink}" stroke-width="1.5"/>
  `),
};

const FALLBACK = svg(`<rect x="20" y="20" width="60" height="60" rx="10" fill="${C.paper}" stroke="${C.ink}" stroke-width="3"/>
  <text x="50" y="58" text-anchor="middle" font-size="24" fill="${C.ink}">?</text>`);

/** render art for an id: SVG placeholder, covered by art/<id>.png if generated */
export function art(id: string, cls = ''): string {
  const ph = ART[id] ?? FALLBACK;
  return `<span class="art ${cls}">${ph}<img src="art/${id}.png" alt="" loading="lazy" onerror="this.remove()"/></span>`;
}
