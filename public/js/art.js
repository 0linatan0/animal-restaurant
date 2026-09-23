export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const svg = (body, view = '0 0 120 100', cls = '') => `<svg class="${cls}" viewBox="${view}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
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
  const bear = role === 'bear';
  const fur = bear ? '#B77C50' : '#FFF8E9', edge = bear ? '#825433' : '#C9B797';
  return svg(`<ellipse cx="130" cy="278" rx="86" ry="12" fill="#567A52" opacity=".10"/>
    ${bear ? `<circle cx="58" cy="85" r="29" fill="${fur}" stroke="${edge}" stroke-width="4"/><circle cx="58" cy="86" r="16" fill="#E4B181"/><circle cx="201" cy="85" r="29" fill="${fur}" stroke="${edge}" stroke-width="4"/><circle cx="201" cy="86" r="16" fill="#E4B181"/>` : `<path d="M76 103 Q43 18 75 12 Q104 9 111 99" fill="${fur}" stroke="${edge}" stroke-width="4"/><path d="M150 102 Q158 11 189 19 Q218 30 181 112" fill="${fur}" stroke="${edge}" stroke-width="4"/><path d="M79 38 Q78 65 91 88 M178 43 L166 89" stroke="#ECC1AD" stroke-width="13" stroke-linecap="round"/>`}
    <path d="M75 190 Q46 220 47 270 Q130 294 211 270 Q210 214 183 190Z" fill="${fur}" stroke="${edge}" stroke-width="4"/>
    <path d="M79 193 L97 209 L160 209 L180 192 L188 274 Q130 288 72 274Z" fill="${bear ? '#738E6A' : '#E9B952'}"/>
    <path d="M103 239 Q130 252 157 239 L155 260 Q130 270 105 260Z" fill="${bear ? '#9EB28B' : '#F5D881'}"/>
    <path d="M55 230 Q22 ${waving ? '157 24 149' : '219 33 236'} Q${waving ? '39 136' : '30 257'} 65 255" fill="${fur}" stroke="${edge}" stroke-width="4"/>
    <path class="animal-arm" d="M196 230 Q225 209 230 234 Q235 253 201 255" fill="${fur}" stroke="${edge}" stroke-width="4"/>
    <path d="M46 126 Q49 68 128 70 Q207 70 215 129 Q224 196 132 207 Q40 201 46 126Z" fill="${fur}" stroke="${edge}" stroke-width="4"/>
    ${bear ? '<ellipse cx="131" cy="160" rx="37" ry="28" fill="#E7BC8D"/>' : ''}
    <ellipse cx="73" cy="154" rx="15" ry="9" fill="#EAA68B" opacity=".7"/><ellipse cx="187" cy="154" rx="15" ry="9" fill="#EAA68B" opacity=".7"/>
    <ellipse cx="96" cy="133" rx="5" ry="7" fill="#574533"/><ellipse cx="165" cy="133" rx="5" ry="7" fill="#574533"/>
    <path d="M124 150 Q131 145 138 150 Q136 159 131 159 Q125 157 124 150Z" fill="#72503D"/>
    <path class="animal-mouth" d="M131 158 L131 165 M119 165 Q125 175 131 165 Q137 175 143 165" fill="none" stroke="#72503D" stroke-width="3" stroke-linecap="round"/>
    ${!bear ? '<path d="M103 74 Q97 53 119 47 Q128 31 143 47 Q168 45 162 73Z" fill="#FFFCF3" stroke="#C9B797" stroke-width="3"/><path d="M105 72 L162 72" stroke="#C9B797" stroke-width="3"/>' : ''}`, '0 0 260 300', cls);
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
