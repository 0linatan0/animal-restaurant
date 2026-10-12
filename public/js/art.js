export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let illustrationId = 0;
const svg = (body, view = '0 0 120 100', cls = '') => {
  const prefix = 'illustration-' + illustrationId++;
  const colors = [...new Set([...body.matchAll(/fill="(#[A-Fa-f0-9]{6})"/g)].map(m => m[1]))];
  const tint = (c, target, amount) => '#' + [1, 3, 5].map(pos => Math.round(parseInt(c.slice(pos, pos + 2), 16) * (1 - amount) + target * amount).toString(16).padStart(2, '0')).join('');
  const defs = colors.map((c, i) => '<linearGradient id="' + prefix + '-' + i + '" x1="0" y1="0" x2="30%" y2="100%"><stop stop-color="' + tint(c, 255, .18) + '"/><stop offset=".55" stop-color="' + c + '"/><stop offset="1" stop-color="' + tint(c, 80, .09) + '"/></linearGradient>').join('');
  // 每个 SVG 的渐变独立命名，避免重复食物共用错误的引用。
  body = body.replace(/fill="(#[A-Fa-f0-9]{6})"/g, (_, c) => 'fill="url(#' + prefix + '-' + colors.indexOf(c) + ')"');
  return '<svg class="' + cls + '" viewBox="' + view + '" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>' + defs + '</defs>' + body + '</svg>';
};
export function foodArt(food, cls = '') {
  const common = 'stroke="#925C35" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  if (food === 'broccoli') return svg(`<ellipse cx="60" cy="89" rx="31" ry="5" fill="#DDBD8A" opacity=".2"/><path d="M48 49 L43 88 Q60 96 76 87 L70 49 L59 63Z" fill="#B8CC7C" stroke="#628451" stroke-width="3"/><path d="M59 85 L59 54 M58 70 L39 51 M62 65 L79 49" fill="none" stroke="#789850" stroke-width="3" stroke-linecap="round"/><path d="M28 62 Q12 60 15 45 Q10 30 28 26 Q31 12 45 18 Q57 4 71 17 Q89 12 94 28 Q111 29 106 46 Q110 61 93 65 Q80 74 69 63 Q54 73 45 62 Q35 70 28 62Z" fill="#699553" stroke="#456E42" stroke-width="3"/><path d="M27 43 Q29 33 39 34 M49 28 Q56 22 64 28 M78 35 Q89 31 94 42 M45 51 Q53 42 62 49 M77 54 Q82 47 88 51" fill="none" stroke="#9DBB73" stroke-width="4" stroke-linecap="round"/>`, undefined, cls);
  if (food === 'greens') return svg(`<ellipse cx="60" cy="91" rx="28" ry="5" fill="#DDBD8A" opacity=".2"/><g stroke="#4F7A43" stroke-width="3" stroke-linejoin="round"><path d="M53 72 Q18 61 17 37 Q10 16 27 14 Q44 9 54 36 L63 67Z" fill="#72A159"/><path d="M62 67 Q56 27 75 12 Q92 4 98 21 Q111 27 98 48 Q86 67 66 75Z" fill="#5D914F"/><path d="M49 65 Q39 39 51 23 Q66 8 74 28 Q84 50 66 73Z" fill="#8FB66C"/></g><path d="M27 28 Q38 51 55 76 M88 26 Q80 51 64 77 M61 32 L60 77" fill="none" stroke="#C8D89A" stroke-width="3" stroke-linecap="round"/><path d="M41 58 Q51 66 57 76 L56 56 L66 56 L65 76 Q73 67 82 57 Q78 82 69 90 Q59 95 49 88Z" fill="#DFE7B7" stroke="#81985F" stroke-width="2.5"/>`, undefined, cls);
  if (food === 'mushroom') return svg(`<ellipse cx="60" cy="89" rx="35" ry="5" fill="#DDBD8A" opacity=".2"/><path d="M49 48 L44 84 Q60 98 77 84 L69 48Z" fill="#F4DEAF" ${common}/><path d="M58 63 L56 83 M65 62 L68 81" stroke="#D7BA85" stroke-width="2.5" stroke-linecap="round"/><path d="M15 57 Q17 14 60 13 Q105 16 106 57 Q96 74 60 74 Q28 74 15 57Z" fill="#A56D43" ${common}/><ellipse cx="60" cy="60" rx="44" ry="12" fill="#E4C38B" stroke="#925C35" stroke-width="3"/><path d="M27 57 L47 65 M42 53 L53 65 M58 52 L60 66 M75 53 L67 65 M91 57 L75 66" stroke="#BA965F" stroke-width="2"/><path d="M15 57 Q17 14 60 13 Q105 16 106 57 Q63 43 15 57Z" fill="#A56D43" ${common}/><path d="M45 27 L73 45 M72 26 L47 44" stroke="#F7DCAE" stroke-width="5" stroke-linecap="round"/>`, undefined, cls);
  if (food === 'bun') return svg(`<ellipse cx="60" cy="88" rx="43" ry="6" fill="#DDBD8A" opacity=".25"/><path d="M16 63 Q18 42 35 30 Q46 17 60 18 Q77 17 87 31 Q104 44 104 65 Q103 88 59 88 Q17 87 16 63Z" fill="#FFF2D1" ${common}/><path d="M32 50 Q43 33 59 31 Q47 45 47 59 M57 31 Q60 47 58 62 M62 31 Q77 42 79 56 M63 30 Q83 33 91 47" fill="none" stroke="#D6AC77" stroke-width="3.5" stroke-linecap="round"/><path d="M46 27 Q49 16 57 24 Q62 14 66 24 Q78 19 75 29 Q60 36 46 27Z" fill="#EBD3A6" stroke="#AD8050" stroke-width="2.5"/><path d="M28 67 Q31 77 46 79" fill="none" stroke="#FFFBEA" stroke-width="5" stroke-linecap="round"/>`, undefined, cls);
  if (food === 'dumpling') return svg(`<ellipse cx="60" cy="82" rx="45" ry="8" fill="#DDBD8A" opacity=".25"/><path d="M13 64 Q23 25 61 24 Q99 27 107 64 Q97 88 60 85 Q24 85 13 64Z" fill="#FFF5D3" ${common}/><path d="M15 63 Q33 76 59 72 Q84 77 105 62" fill="none" stroke="#D4A469" stroke-width="3"/><path d="M25 52 L34 65 M39 39 L44 59 M57 33 L59 57 M77 36 L73 58 M92 46 L83 63" stroke="#C99559" stroke-width="4" stroke-linecap="round"/>`, undefined, cls);
  if (food === 'shrimp') return svg(`
    <ellipse cx="64" cy="89" rx="40" ry="5" fill="#DDBD8A" opacity=".2"/>
    <g stroke="#A65337" stroke-linecap="round" stroke-linejoin="round">
      <path d="M34 37 Q15 7 5 20 M32 41 Q13 29 4 38" fill="none" stroke-width="2.4"/>
      <path d="M42 38 Q70 15 95 37 Q116 58 97 78 Q79 97 60 77 L64 66 Q79 78 88 64 Q96 49 78 44 L56 53Z" fill="#F09262" stroke-width="2.8"/>
      <path d="M58 33 Q64 41 62 50 M73 30 Q80 36 78 44 M90 36 Q92 44 85 48 M100 49 L90 55 M99 65 L88 63 M89 79 L80 70 M76 83 L73 72" fill="none" stroke="#C46845" stroke-width="2.4"/>
      <path d="M61 73 Q47 67 43 78 L55 87 L63 85 L67 94 Q79 88 72 78Z" fill="#E98054" stroke-width="2.4"/>
      <path d="M48 78 L61 82 M63 84 L65 90" fill="none" stroke-width="1.8"/>
      <path d="M58 29 Q38 24 22 41 L11 44 L23 49 Q28 64 48 59 Q62 50 58 29Z" fill="#F7A777" stroke-width="2.8"/>
      <path d="M24 40 L18 32 L34 36" fill="#F7A777" stroke-width="2"/>
      <path d="M34 60 L27 70 M43 60 L38 72 M51 56 L48 66" fill="none" stroke-width="2"/>
      <path d="M48 34 Q52 43 47 50" fill="none" stroke="#FFD0A2" stroke-width="3.5"/>
    </g>
    <circle cx="29" cy="43" r="3.2" fill="#573C2C"/><circle cx="28.2" cy="42" r=".9" fill="#FFF8E9"/>`, undefined, cls);
  // 一幅图只画一块：露出的短骨头与包裹它的肉共同形成辨认线索。
  return svg(`
    <ellipse cx="60" cy="87" rx="42" ry="6" fill="#DDBD8A" opacity=".22"/>
    <g transform="rotate(-22 60 50)" stroke-linecap="round" stroke-linejoin="round">
      <path d="M33 43 L24 43 Q21 43 22 47 L22 53 Q21 56 25 56 L96 56 Q99 56 98 52 L98 47 Q99 43 95 43Z" fill="#FFF5D9" stroke="#B19A73" stroke-width="2.5"/>
      <path d="M34 29 Q45 24 60 28 Q73 23 86 29 Q93 37 91 48 Q96 63 87 72 Q74 77 60 73 Q45 77 33 71 Q26 66 28 52 Q24 40 34 29Z" fill="#B96F43" stroke="#85492F" stroke-width="3"/>
      <path d="M34 29 Q45 24 60 28 Q73 23 86 29 L87 39 Q74 35 61 39 Q47 35 31 41Z" fill="#E1A173"/>
      <path d="M35 61 Q49 66 60 62 Q73 67 86 61" fill="none" stroke="#8E4D31" stroke-width="4"/>
      <path d="M38 44 Q43 49 40 55 M52 43 Q57 48 53 56 M67 43 Q72 49 68 56 M81 43 Q84 47 81 53" fill="none" stroke="#E6A675" stroke-width="3"/>
    </g>`, undefined, cls);
}
export function animalArt(role = 'rabbit', cls = '', waving = false) {
  const bear = role === 'bear', fur = bear ? '#BA855E' : '#FFF7E7', edge = bear ? '#986545' : '#BD9072';
  const apron = bear ? '#A6CDB5' : '#F4CC79';
  return svg(`<ellipse cx="130" cy="285" rx="76" ry="8" fill="#795333" opacity=".12"/>
    <g stroke="${edge}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
    ${bear ? '<circle cx="66" cy="83" r="28" fill="#BA855E"/><circle cx="194" cy="83" r="28" fill="#BA855E"/><circle cx="66" cy="83" r="16" fill="#DBB28D" stroke="none"/><circle cx="194" cy="83" r="16" fill="#DBB28D" stroke="none"/>' : '<path d="M74 105Q31 12 68 9Q98 8 110 100" fill="#FFF7E7"/><path d="M148 99Q158 5 188 12Q226 28 182 109" fill="#FFF7E7"/><path d="M68 32Q65 52 88 87M186 35Q188 53 167 88" fill="none" stroke="#F3B79F" stroke-width="16"/>'}
    <path d="M89 254L83 279Q98 290 113 280L117 261M148 260L151 281Q167 289 179 279L174 253" fill="${fur}"/>
    <path d="M80 192Q52 223 61 268Q130 292 199 268Q208 223 180 192Z" fill="${bear ? '#F9EDD7' : '#FFF8E9'}"/>
    <path d="M64 211Q44 211 37 ${waving ? '170Q33 148 49 146Q66 148 62 176L83 220' : '233Q32 252 48 258Q64 262 78 243'}" fill="${fur}"/>
    <path class="animal-arm" d="M185 215Q214 216 222 237Q225 255 210 258Q197 258 182 242" fill="${fur}"/>
    <path d="M83 192L99 192L101 217H160L162 192H177L190 268Q130 288 71 268Z" fill="${apron}"/>
    <path d="M106 240Q130 245 154 240L152 259Q130 274 108 259Z" fill="${bear ? '#BDDEC8' : '#F9DE9C'}"/>
    <path d="M45 129Q43 66 128 66Q212 66 217 127Q232 203 131 212Q30 204 45 129Z" fill="${fur}"/>
    </g>
    <path d="M60 127Q64 84 107 81" fill="none" stroke="${bear ? '#D4A682' : '#FFFEF7'}" stroke-width="9" stroke-linecap="round" opacity=".65"/>
    ${bear ? '<ellipse cx="131" cy="166" rx="34" ry="27" fill="#EBC59C"/>' : ''}
    <ellipse cx="74" cy="164" rx="15" ry="8" fill="#F1B098" opacity=".85"/><ellipse cx="186" cy="164" rx="15" ry="8" fill="#F1B098" opacity=".85"/>
    <ellipse cx="97" cy="144" rx="5.5" ry="7" fill="#86583C"/><ellipse cx="165" cy="144" rx="5.5" ry="7" fill="#86583C"/>
    <circle cx="95" cy="142" r="1.5" fill="#FFF8EC"/><circle cx="163" cy="142" r="1.5" fill="#FFF8EC"/>
    <path d="M124 156Q131 151 138 156Q137 163 131 164Q125 163 124 156" fill="${bear ? '#87583B' : '#DE9B7D'}"/>
    <path class="animal-mouth" d="M131 164V170M119 169Q124 177 131 170Q138 177 143 169" fill="none" stroke="#986545" stroke-width="2.8" stroke-linecap="round"/>
    <path d="M112 196Q132 201 153 196" fill="none" stroke="${bear ? '#C99872' : '#E7C9A6'}" stroke-width="3" opacity=".5"/>`, '0 0 260 300', cls);
}
export function icon(name, cls = '') {
  const paths = {
    hand: '<path d="M10 18V7Q10 3 14 5V16L17 12Q19 10 21 13L27 17V25Q24 30 16 28L7 21Q3 17 6 15Z"/>',
    play: '<path d="M9 5L25 16 9 27Z" fill="currentColor" stroke="none"/>',
    sound: '<path d="M5 12H11L18 6V26L11 20H5Z"/><path d="M23 11Q29 16 23 21M26 6Q37 16 26 26"/>',
    parent: '<circle cx="16" cy="10" r="5"/><path d="M6 28V25Q6 17 16 17Q26 17 26 25V28"/>',
    close: '<path d="M8 8L24 24M24 8L8 24"/>',
    back: '<path d="M19 6L9 16 19 26M10 16H28"/>',
    check: '<path d="M5 17L12 24 27 8"/>',
    pause: '<path d="M11 7V25M22 7V25" stroke-width="5"/>',
    count: '<circle cx="10" cy="9" r="3"/><circle cx="23" cy="9" r="3"/><circle cx="10" cy="23" r="3"/><circle cx="23" cy="23" r="3"/>',
    plate: '<ellipse cx="16" cy="18" rx="13" ry="8"/><ellipse cx="16" cy="18" rx="8" ry="4"/>',
    mic: '<rect x="11" y="3" width="10" height="18" rx="5"/><path d="M6 15V17Q6 26 16 26Q26 26 26 17V15M16 26V30M10 30H22"/>',
    download: '<path d="M16 3V21M9 15L16 22 23 15M4 23V29H28V23"/>',
    leaf: '<path d="M6 27Q-2 3 28 4Q29 30 6 27ZM6 27L22 11"/>',
    bag: '<path d="M6 11H26L28 29H4ZM11 12V8Q11 2 16 2Q21 2 21 8V12"/>',
  };
  return svg(`<g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.leaf}</g>`, '0 0 34 34', `icon ${cls}`);
}
export function plantArt(cls = '') {
  return svg('<path d="M59 72Q66 37 51 11M62 48Q25 48 24 22Q53 20 62 48M62 57Q92 57 98 29Q69 31 62 57" fill="#88A574" stroke="#638056" stroke-width="3"/><path d="M34 64H86L80 96H42Z" fill="#DCA37B"/><path d="M31 63H89V71H31Z" fill="#E9BA92"/>', undefined, cls);
}
