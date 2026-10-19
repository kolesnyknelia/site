/* =========================================================
   «Паперове містечко» — вирізалки, макет для друку (16 аркушів A4, папір 200–250 г/м²)
   Лінії різання (суцільні) і згину (пунктир) надруковані: вирізає дитина з дорослим.
   Вихід: print/out/mistechko.pdf
   ========================================================= */
"use strict";
const L = require("./lib");
L.ensureAssets();
const { emojiAt, emojiInner, header, footer, page, esc, PAGE, SAFE, COLORS: C } = L;

const INK = "#2b2240", FOLD = "#9b7bff";
const svgPage = inner => `<svg viewBox="0 0 ${PAGE.w} ${PAGE.h}" style="position:absolute;left:0;top:0;width:${PAGE.w}mm;height:${PAGE.h}mm" font-family="Nunito">${inner}</svg>`;
const txt = (x, y, t, size = 4, opt = "") => `<text x="${x}" y="${y}" font-size="${size}" font-weight="800" fill="${INK}" ${opt}>${esc(t)}</text>`;
const cut = d => `<path d="${d}" fill="none" stroke="${INK}" stroke-width=".45" stroke-linejoin="round"/>`;
const cutRect = (x, y, w, h, r = 2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${INK}" stroke-width=".45"/>`;
const fold = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${FOLD}" stroke-width=".45" stroke-dasharray="2 1.5"/>`;
const scissors = (x, y) => emojiAt("✂️", x, y, 5);
const legend = y => `${cut(`M${SAFE} ${y} h10`)}${txt(SAFE + 12, y + 1.4, "вирізати", 3.2)}${fold(SAFE + 34, y, SAFE + 44, y)}${txt(SAFE + 46, y + 1.4, "згинати", 3.2)}<rect x="${SAFE + 66}" y="${y - 2}" width="6" height="4" fill="#fff3c4" stroke="${INK}" stroke-width=".3"/>${txt(SAFE + 74, y + 1.4, "клеїти", 3.2)}`;

/** Фігурка, що стоїть: картка + клапан-основа знизу */
function stand(x, y, w, h, ch, label, bg = "#fff") {
  const tab = 12;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${bg}"/>
    ${emojiAt(ch, x + (w - Math.min(w, h - 9) * 0.86) / 2, y + 2, Math.min(w, h - 9) * 0.86)}
    ${label ? txt(x + w / 2, y + h - 2.5, label, 3.6, 'text-anchor="middle"') : ""}
    <rect x="${x}" y="${y + h}" width="${w}" height="${tab}" fill="#fff3c4"/>
    ${txt(x + w / 2, y + h + 7.5, "згини назад · підстава", 2.6, 'text-anchor="middle" fill="#8b7f9e"')}
    ${fold(x, y + h, x + w, y + h)}${cutRect(x, y, w, h + tab, 3)}`;
}
/** «Будиночок»-тент: дві однакові половинки, середина — згин */
function tent(x, y, w, h, ch, label, bg) {
  const img = (yy, flip) => `<g transform="${flip ? `rotate(180 ${x + w / 2} ${yy + h / 2})` : ""}"><rect x="${x}" y="${yy}" width="${w}" height="${h}" fill="${bg}"/>${emojiAt(ch, x + w / 2 - (h - 10) / 2, yy + 2, h - 10)}${txt(x + w / 2, yy + h - 2.5, label, 3.6, 'text-anchor="middle"')}</g>`;
  return img(y, true) + img(y + h, false) + fold(x, y + h, x + w, y + h) + cutRect(x, y, w, 2 * h, 3);
}

/* ---------- 1–4. Будиночок Тямка: кімнати ---------- */
function room(n, name, wall, floor, deco, items) {
  let s = header(`Будиночок Тямка: ${name}`, "Виріж кімнату і зігни: стіна + підлога. Меблі — на підставках", C.coral, n);
  let g = "";
  const rx = SAFE, ry = 34, rw = PAGE.w - 2 * SAFE, wallH = 88, floorH = 46;
  g += `<rect x="${rx}" y="${ry}" width="${rw}" height="${wallH}" fill="${wall}"/><rect x="${rx}" y="${ry + wallH}" width="${rw}" height="${floorH}" fill="${floor}"/>`;
  for (let i = 0; i < 12; i++) g += `<line x1="${rx + i * rw / 12}" y1="${ry + wallH}" x2="${rx + i * rw / 12 - 8}" y2="${ry + wallH + floorH}" stroke="rgba(0,0,0,.06)" stroke-width=".6"/>`;
  g += deco(rx, ry, rw, wallH);
  g += fold(rx, ry + wallH, rx + rw, ry + wallH) + cutRect(rx, ry, rw, wallH + floorH, 4) + scissors(rx - 3, ry - 3);
  const iw = 42, ih = 46, gap = (rw - 4 * iw) / 3;
  items.forEach((it, i) => { g += stand(rx + (i % 4) * (iw + gap), 178 + Math.floor(i / 4) * 62, iw, ih, it[0], it[1]); });
  g += legend(PAGE.h - 18);
  return page(s + svgPage(g) + footer("Паперове містечко", `аркуш ${n}`), { bg: "#fffdf9" });
}
const window_ = (x, y) => `<rect x="${x}" y="${y}" width="40" height="34" rx="2" fill="#cfe9fb" stroke="#fff" stroke-width="2.5"/><line x1="${x + 20}" y1="${y}" x2="${x + 20}" y2="${y + 34}" stroke="#fff" stroke-width="2"/><line x1="${x}" y1="${y + 17}" x2="${x + 40}" y2="${y + 17}" stroke="#fff" stroke-width="2"/>`;
const ROOMS = [
  ["Кухня", "#fde3c8", "#d8b48a", (x, y) => window_(x + 70, y + 14) + `<rect x="${x + 8}" y="${y + 52}" width="52" height="36" rx="2" fill="#fff" stroke="#e0c8a8"/><rect x="${x + 128}" y="${y + 52}" width="48" height="36" rx="2" fill="#fff" stroke="#e0c8a8"/>` + emojiAt("🕰️", x + 140, y + 12, 18),
    [["🍳", "Сковорідка"], ["🫖", "Чайник"], ["🍽️", "Тарілка"], ["🪑", "Стілець"], ["🥛", "Молоко"], ["🍞", "Хліб"], ["🧁", "Кекс"], ["🪴", "Квітка"]]],
  ["Спальня", "#e4ddff", "#c9a37a", (x, y) => window_(x + 20, y + 14) + emojiAt("🖼️", x + 90, y + 12, 22) + emojiAt("💡", x + 150, y + 6, 16),
    [["🛏️", "Ліжко"], ["🧸", "Ведмедик"], ["📚", "Книжки"], ["🪀", "Йо-йо"], ["🧦", "Шкарпетки"], ["🕯️", "Свічка"], ["🎒", "Рюкзак"], ["🪁", "Змій"]]],
  ["Ванна", "#d6f1f7", "#b8d8e0", (x, y) => { let t = ""; for (let i = 0; i < 16; i++) for (let j = 0; j < 6; j++) t += `<rect x="${x + i * 11.6}" y="${y + j * 14.6}" width="11" height="14" fill="rgba(255,255,255,.35)"/>`; return t + emojiAt("🪞", x + 80, y + 10, 26); },
    [["🛁", "Ванна"], ["🚿", "Душ"], ["🚽", "Туалет"], ["🪥", "Щітка"], ["🧼", "Мило"], ["🧴", "Шампунь"], ["🦆", "Качечка"], ["🧽", "Губка"]]],
  ["Садок", "#d8efff", "#a8d58a", (x, y) => emojiAt("☀️", x + 150, y + 6, 22) + emojiAt("☁️", x + 20, y + 10, 24) + emojiAt("☁️", x + 80, y + 4, 18) + `<path d="M${x} ${y + 88} Q ${x + 95} ${y + 70} ${x + 190} ${y + 88}" fill="#bfe3a5"/>`,
    [["🌳", "Дерево"], ["🌷", "Тюльпан"], ["🌻", "Соняшник"], ["🐈", "Котик"], ["🐕", "Песик"], ["🪣", "Відерце"], ["🦋", "Метелик"], ["🍓", "Полуниця"]]]
];

/* ---------- 5–8. Ляльки в українському вбранні ---------- */
const SKIN = ["#ffdcb8", "#f1c27d", "#ffe0c7", "#d9a066"];
function cross(x, y, s, c) { return `<path d="M${x} ${y - s}h${s * 0}" /><rect x="${x - s / 2}" y="${y - s * 1.5}" width="${s}" height="${s * 3}" fill="${c}"/><rect x="${x - s * 1.5}" y="${y - s / 2}" width="${s * 3}" height="${s}" fill="${c}"/>`; }
/** Смуга орнаменту «вишивка»: ромбики і хрестики */
function band(x, y, w, h, c1 = "#d62828", c2 = "#1d1d1d") {
  let s = ""; const n = Math.max(2, Math.round(w / h));
  for (let i = 0; i < n; i++) { const cx = x + (i + .5) * w / n, cy = y + h / 2, r = h * 0.42;
    s += `<polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="${i % 2 ? c2 : c1}"/><rect x="${cx - r * .25}" y="${cy - r * .25}" width="${r * .5}" height="${r * .5}" fill="#fff"/>`; }
  return s;
}
function doll(ox, oy, v) {
  const skin = SKIN[v.skin], hair = v.hair;
  const hairBack = v.girl ? (v.curly ? `<circle cx="30" cy="18" r="16" fill="${hair}"/><circle cx="17" cy="26" r="7" fill="${hair}"/><circle cx="43" cy="26" r="7" fill="${hair}"/>`
    : `<path d="M16 18 Q30 0 44 18 L46 44 Q44 48 40 44 L38 26 L22 26 L20 44 Q16 48 14 44Z" fill="${hair}"/>`) : "";
  const hairFront = v.girl ? `<path d="M17 18 Q30 4 43 18 Q36 11 30 13 Q24 11 17 18Z" fill="${hair}"/>` : `<path d="M16 19 Q18 4 30 5 Q43 4 44 19 Q40 11 30 12 Q21 11 16 19Z" fill="${hair}"/>`;
  return `<g transform="translate(${ox} ${oy})">
    ${hairBack}
    <rect x="9" y="40" width="7" height="38" rx="3.5" fill="${skin}"/><rect x="44" y="40" width="7" height="38" rx="3.5" fill="${skin}"/>
    <rect x="18" y="80" width="10" height="58" rx="4" fill="${skin}"/><rect x="32" y="80" width="10" height="58" rx="4" fill="${skin}"/>
    <path d="M15 40 Q15 36 22 36 L38 36 Q45 36 45 40 L44 82 L16 82Z" fill="#f4f1ec"/>
    <path d="M17 76 L43 76 L43 90 L31 90 L30 86 L29 90 L17 90Z" fill="#e9e4dc"/>
    <rect x="26" y="30" width="8" height="8" fill="${skin}"/>
    <circle cx="30" cy="20" r="13" fill="${skin}"/>
    ${hairFront}
    <circle cx="25" cy="21" r="1.6" fill="${INK}"/><circle cx="35" cy="21" r="1.6" fill="${INK}"/>
    <circle cx="22" cy="25" r="2" fill="#ffadad" opacity=".6"/><circle cx="38" cy="25" r="2" fill="#ffadad" opacity=".6"/>
    <path d="M26 26 Q30 29.5 34 26" stroke="${INK}" stroke-width="1" fill="none" stroke-linecap="round"/>
    <rect x="16" y="138" width="12" height="7" rx="3" fill="#7a5230"/><rect x="32" y="138" width="12" height="7" rx="3" fill="#7a5230"/>
  </g>
  <path d="M${ox + 6} ${oy + 2} Q ${ox + 30} ${oy - 6} ${ox + 54} ${oy + 2} L${ox + 56} ${oy + 148} L${ox + 4} ${oy + 148}Z" fill="none" stroke="${INK}" stroke-width=".45" stroke-linejoin="round"/>
  ${tabStand(ox + 4, oy + 148, 52)}`;
}
const tabStand = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="14" fill="#fff3c4" stroke="${INK}" stroke-width=".45"/>${fold(x, y, x + w, y)}${txt(x + w / 2, y + 9, "підстава: згини назад", 2.6, 'text-anchor="middle" fill="#8b7f9e"')}`;
/* Вбрання в системі координат ляльки; tabs — клапани для кріплення */
const tabs = list => list.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="${INK}" stroke-width=".45"/>${fold(x, y + (h > 0 ? h : 0), x + w, y + (h > 0 ? h : 0))}`).join("");
const OUT = {
  shirt: (c = "#ffffff", orn = ["#d62828", "#1d1d1d"], long = true) => ({ h: 52, svg:
    `<path d="M14 38 Q14 34 22 34 L38 34 Q46 34 46 38 L${long ? 52 : 50} ${long ? 78 : 52} L${long ? 44 : 44} ${long ? 79 : 54} L44 84 L16 84 L16 ${long ? 79 : 54} L${long ? 8 : 10} ${long ? 78 : 52}Z" fill="${c}" stroke="${INK}" stroke-width=".45"/>
     ${band(24, 35, 12, 4, ...orn)}${band(18, 78, 24, 5, ...orn)}${long ? band(8.5, 70, 7, 5, ...orn) + band(44.5, 70, 7, 5, ...orn) : ""}`, tabs: [[18, 30, 6, 4], [36, 30, 6, 4]] }),
  vest: (c = "#5b3b2a") => ({ svg: `<path d="M15 38 Q15 34 22 34 L27 34 L27 82 L16 82Z M33 34 L38 34 Q45 34 45 38 L44 82 L33 82Z" fill="${c}" stroke="${INK}" stroke-width=".45"/>${band(16, 70, 10, 5, "#ffc93c", "#d62828")}${band(34, 70, 10, 5, "#ffc93c", "#d62828")}<rect x="16.5" y="36" width="9" height="34" fill="none" stroke="#e8c37a" stroke-width=".8"/><rect x="34.5" y="36" width="9" height="34" fill="none" stroke="#e8c37a" stroke-width=".8"/>`, tabs: [[17, 30, 6, 4], [37, 30, 6, 4]] }),
  skirt: (c = "#c1121f", orn = ["#ffc93c", "#1d1d1d"]) => ({ svg: `<path d="M17 78 L43 78 L50 116 L10 116Z" fill="${c}" stroke="${INK}" stroke-width=".45"/>${band(11, 108, 38, 6, ...orn)}`, tabs: [[20, 74, 6, 4], [34, 74, 6, 4]] }),
  pants: (c = "#2f6fe4", wide = false) => ({ svg: `<path d="M17 78 L43 78 L${wide ? 46 : 43} 138 L31 138 L30 96 L29 138 L${wide ? 14 : 17} 138Z" fill="${c}" stroke="${INK}" stroke-width=".45"/>${wide ? band(14.5, 131, 14, 6, "#ffc93c", "#1d1d1d") + band(31.5, 131, 14, 6, "#ffc93c", "#1d1d1d") : ""}`, tabs: [[20, 74, 6, 4], [34, 74, 6, 4]] }),
  shorts: (c = "#4fc29f") => ({ svg: `<path d="M17 78 L43 78 L44 100 L31 100 L30 92 L29 100 L16 100Z" fill="${c}" stroke="${INK}" stroke-width=".45"/>`, tabs: [[20, 74, 6, 4], [34, 74, 6, 4]] }),
  dress: (c = "#ff8fb1", dots = "#fff") => ({ svg: `<path d="M15 38 Q15 34 22 34 L38 34 Q45 34 45 38 L46 50 L42 50 L42 76 L52 118 L8 118 L18 76 L18 50 L14 50Z" fill="${c}" stroke="${INK}" stroke-width=".45"/>${Array.from({ length: 14 }, (_, i) => `<circle cx="${14 + (i % 5) * 8 + (Math.floor(i / 5) % 2) * 4}" cy="${84 + Math.floor(i / 5) * 10}" r="1.4" fill="${dots}"/>`).join("")}`, tabs: [[18, 30, 6, 4], [36, 30, 6, 4]] }),
  coat: (c, stripe, label = "") => ({ svg: `<path d="M14 38 Q14 34 22 34 L38 34 Q46 34 46 38 L52 80 L45 81 L45 92 L15 92 L15 81 L8 80Z" fill="${c}" stroke="${INK}" stroke-width=".45"/><line x1="30" y1="36" x2="30" y2="92" stroke="rgba(0,0,0,.25)" stroke-width=".8"/>${stripe ? `<rect x="15" y="70" width="30" height="4" fill="${stripe}"/><rect x="8.5" y="62" width="6" height="3" fill="${stripe}"/><rect x="45.5" y="62" width="6" height="3" fill="${stripe}"/>` : ""}${label}`, tabs: [[18, 30, 6, 4], [36, 30, 6, 4]] }),
  wreath: () => ({ svg: `<path d="M14 14 Q30 -2 46 14" stroke="#38b000" stroke-width="3" fill="none"/>${[["#e5383b", 15, 12], ["#ffc93c", 20, 6.5], ["#2f6fe4", 25, 3.6], ["#e5383b", 30, 3], ["#ff8fb1", 35, 3.6], ["#ffc93c", 40, 6.5], ["#e5383b", 45, 12]].map(([c, x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${c}"/><circle cx="${x}" cy="${y}" r="1" fill="#fff"/>`).join("")}${["#e5383b", "#ffc93c", "#2f6fe4", "#38b000"].map((c, i) => `<rect x="${44 + i * 2.2}" y="12" width="2" height="${30 - i * 3}" fill="${c}"/>`).join("")}`, tabs: [[11, 16, 5, 4], [44, 16, 5, 4]] }),
  hat: (c, pom = "#fff") => ({ svg: `<path d="M16 16 Q30 -2 44 16 L45 18 L15 18Z" fill="${c}" stroke="${INK}" stroke-width=".45"/><rect x="14" y="15" width="32" height="5" rx="2" fill="${pom}" stroke="${INK}" stroke-width=".3"/><circle cx="30" cy="3" r="3.5" fill="${pom}"/>`, tabs: [[11, 18, 5, 4], [44, 18, 5, 4]] }),
  helmet: () => ({ svg: `<path d="M15 17 Q15 2 30 2 Q45 2 45 17 L50 19 L10 19Z" fill="#ffc93c" stroke="${INK}" stroke-width=".45"/><rect x="27" y="3" width="6" height="14" fill="#e5383b"/>`, tabs: [[9, 19, 5, 4], [46, 19, 5, 4]] })
};
const YR = { shirt: [30, 84], vest: [30, 82], skirt: [74, 116], pants: [74, 138], shorts: [74, 100], dress: [30, 118], coat: [30, 92], wreath: [-2, 42], hat: [-2, 22], helmet: [1, 23] };
Object.keys(OUT).forEach(k => { const f = OUT[k]; OUT[k] = (...a) => Object.assign(f(...a), { yr: YR[k] }); });
const coatDoctor = () => OUT.coat("#ffffff", null, `<rect x="33" y="44" width="8" height="2.4" fill="#e5383b"/><rect x="35.8" y="41.2" width="2.4" height="8" fill="#e5383b"/>${emojiAt("🩺", 17, 40, 12)}`);
const DOLLS = [
  { name: "Оксанка", girl: true, skin: 0, hair: "#c98b3a", clothes: [OUT.shirt(), OUT.skirt(), OUT.wreath(), OUT.dress("#ffc93c", "#ff7a59"), OUT.vest("#2b6f3e"), OUT.coat("#ff8fb1", null)] },
  { name: "Тарасик", girl: false, skin: 1, hair: "#4a2c1a", clothes: [OUT.shirt("#ffffff", ["#2f6fe4", "#1d1d1d"]), OUT.pants("#c1121f", true), OUT.vest(), OUT.shirt("#4fc29f", ["#ffffff", "#ffffff"], false), OUT.shorts("#2f6fe4"), OUT.hat("#e5383b")] },
  { name: "Марічка", girl: true, curly: true, skin: 3, hair: "#2b1a12", clothes: [OUT.shirt("#ffffff", ["#1d1d1d", "#d62828"]), OUT.skirt("#2f6fe4", ["#ffffff", "#ffc93c"]), coatDoctor(), OUT.dress("#9b7bff"), OUT.coat("#5b9dff", "#ffffff"), OUT.hat("#9b7bff", "#ffc93c")] },
  { name: "Андрійко", girl: false, skin: 2, hair: "#e0b34a", clothes: [OUT.coat("#e5383b", "#ffe14d"), OUT.helmet(), OUT.pants("#3a5a8c"), OUT.shirt("#ffc93c", ["#ff7a59", "#ff7a59"], true), OUT.shirt("#ffffff", ["#d62828", "#1d1d1d"]), OUT.shorts("#8b5a2b")] }
];
/** Розкладка вбрання: 2 колонки × 3 ряди праворуч від ляльки */
function dollPage(n, d) {
  let s = header(`Лялька ${d.name}`, "Виріж ляльку та вбрання. Білі клапани загинай за ляльку", C.pink, n);
  let g = doll(SAFE + 2, 42, d);
  const cols = [78, 140], rows = [36, 120, 204];
  d.clothes.forEach((o, i) => {
    const x = cols[i % 2], y = rows[Math.floor(i / 2)], [y0, y1] = o.yr;
    const sc = Math.min(1, 80 / (y1 - y0));            // довгі речі трохи зменшуємо, якщо не влазять у ряд
    g += `<g transform="translate(${x} ${y + (80 - (y1 - y0) * sc) / 2}) scale(${sc}) translate(0 ${-y0})">${o.tabs ? tabs(o.tabs) : ""}${o.svg}</g>`;
  });
  g += legend(PAGE.h - 14);
  return page(s + svgPage(g) + footer("Паперове містечко", `аркуш ${n}`), { bg: "#fffdf9" });
}

/* ---------- 9–10. Ферма ---------- */
function farmPage(n, animals, extra = "") {
  let s = header("Ферма Тямка", "Виріж, зігни посередині — тваринка стоїть сама", C.mint, n);
  let g = "";
  animals.forEach((a, i) => { const x = SAFE + (i % 3) * 63, y = 34 + Math.floor(i / 3) * 112; g += tent(x, y, 58, 50, a[0], a[1], a[2]); });
  g += extra + legend(PAGE.h - 18);
  return page(s + svgPage(g) + footer("Паперове містечко", `аркуш ${n}`), { bg: "#fffdf9" });
}
const fence = (x, y) => { let f = `<rect x="${x}" y="${y + 6}" width="120" height="4" fill="#c58b4a"/><rect x="${x}" y="${y + 20}" width="120" height="4" fill="#c58b4a"/>`;
  for (let i = 0; i < 8; i++) f += `<path d="M${x + 3 + i * 15} ${y + 32} L${x + 3 + i * 15} ${y + 4} L${x + 8 + i * 15} ${y} L${x + 13 + i * 15} ${y + 4} L${x + 13 + i * 15} ${y + 32}Z" fill="#e0a868"/>`;
  return f + `<rect x="${x}" y="${y + 32}" width="120" height="10" fill="#fff3c4"/>` + fold(x, y + 32, x + 120, y + 32) + cut(`M${x} ${y + 42} L${x} ${y + 4} ${Array.from({ length: 8 }, (_, i) => `L${x + 3 + i * 15} ${y + 4} L${x + 8 + i * 15} ${y} L${x + 13 + i * 15} ${y + 4}`).join(" ")} L${x + 120} ${y + 4} L${x + 120} ${y + 42}Z`); };

/* ---------- 11–12. Паперові сквіші + корони ---------- */
const SQ = {
  "Пончик": { col: "#e8b06a", d: "M45 5 C70 5 85 22 85 45 C85 68 68 85 45 85 C22 85 5 68 5 45 C5 22 20 5 45 5Z",
    face: `<path d="M12 40 C14 18 30 10 45 10 C62 10 78 20 78 40 C72 46 66 38 60 44 C54 50 48 40 42 46 C36 52 28 42 22 48 C16 52 12 46 12 40Z" fill="#ff8fb1"/>${[[25, 22, "#fff"], [40, 18, "#5b9dff"], [58, 22, "#ffc93c"], [32, 34, "#4fc29f"], [66, 32, "#fff"], [50, 30, "#e5383b"]].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="5" height="1.8" rx=".9" fill="${c}" transform="rotate(${x % 60 - 30} ${x} ${y})"/>`).join("")}` },
  "Котик": { col: "#ffb35c", d: "M12 30 L10 4 L32 18 C40 15 50 15 58 18 L80 4 L78 30 C86 42 86 62 76 74 C66 86 24 86 14 74 C4 62 4 42 12 30Z", face: `<path d="M14 10 L28 20 L16 28Z M76 10 L62 20 L74 28Z" fill="#ffd6a3"/>` },
  "Хмаринка": { col: "#d6ecff", d: "M20 75 C6 75 2 58 12 50 C6 36 20 24 32 30 C36 14 58 10 66 26 C80 22 90 36 84 48 C94 56 88 75 74 75Z", face: "" },
  "Вареник": { col: "#fff1d6", d: "M6 62 C6 30 26 12 45 12 C64 12 84 30 84 62 C70 70 20 70 6 62Z", face: `<path d="M8 60 Q 12 64 16 60 Q 20 64 24 60 Q 28 64 32 60 Q 36 64 40 60 Q 44 64 48 60 Q 52 64 56 60 Q 60 64 64 60 Q 68 64 72 60 Q 76 64 82 60" fill="none" stroke="#e8c48a" stroke-width="1.6"/>` }
};
const kawaii = (cx, cy) => `<circle cx="${cx - 12}" cy="${cy}" r="3.2" fill="${INK}"/><circle cx="${cx + 12}" cy="${cy}" r="3.2" fill="${INK}"/><circle cx="${cx - 11}" cy="${cy - 1}" r="1" fill="#fff"/><circle cx="${cx + 13}" cy="${cy - 1}" r="1" fill="#fff"/><path d="M${cx - 4} ${cy + 4} Q${cx} ${cy + 8} ${cx + 4} ${cy + 4}" stroke="${INK}" stroke-width="1.4" fill="none" stroke-linecap="round"/><ellipse cx="${cx - 19}" cy="${cy + 6}" rx="4" ry="2.4" fill="#ff8fb1" opacity=".7"/><ellipse cx="${cx + 19}" cy="${cy + 6}" rx="4" ry="2.4" fill="#ff8fb1" opacity=".7"/>`;
function squishy(x, y, name) {
  const q = SQ[name];
  const front = `<g transform="translate(${x} ${y})"><path d="${q.d}" fill="${q.col}"/>${q.face}${kawaii(45, name === "Вареник" ? 42 : 50)}${cut(q.d)}</g>`;
  const back = `<g transform="translate(${x + 92} ${y})"><path d="${q.d}" fill="${q.col}" opacity=".55"/>${txt(45, 50, "зворот", 4, 'text-anchor="middle" fill="#8b7f9e"')}${cut(q.d)}</g>`;
  return front + back + txt(x, y - 3, `${name}: виріж дві частини`, 4);
}
function crown(x, y, c1, c2, label) {
  const w = 180, h = 34;
  let d = `M${x} ${y + h} L${x} ${y + 14}`;
  for (let i = 0; i < 6; i++) d += ` L${x + i * 30 + 15} ${y} L${x + (i + 1) * 30} ${y + 14}`;
  d += ` L${x + w} ${y + h}Z`;
  let jewels = ""; for (let i = 0; i < 6; i++) jewels += `<circle cx="${x + i * 30 + 15}" cy="${y + 22}" r="3.5" fill="${c2}"/><circle cx="${x + i * 30 + 15}" cy="${y + 6}" r="2" fill="#fff"/>`;
  return `<path d="${d}" fill="${c1}"/>${band(x + 4, y + h - 7, w - 8, 5, c2, "#ffffff")}${jewels}${cut(d)}<rect x="${x + w}" y="${y + 14}" width="10" height="${h - 14}" fill="#fff3c4" stroke="${INK}" stroke-width=".45"/>${txt(x, y - 3, label, 4)}`;
}
function squishyPage(n, names, crownArgs) {
  let s = header("Паперові сквіші", "Виріж, склей краї скотчем, залиш дірочку, напхай зім'ятим папером і заклей", C.lilac, n);
  let g = squishy(SAFE, 40, names[0]) + squishy(SAFE, 140, names[1]) + crown(SAFE, 246, ...crownArgs);
  g += legend(PAGE.h - 14);
  return page(s + svgPage(g) + footer("Паперове містечко", `аркуш ${n}`), { bg: "#fffdf9" });
}

/* ---------- 13–14. Маски ---------- */
function mask(x, y, ch, name) {
  const s = 92;
  const eye = (ex, ey) => `<circle cx="${ex}" cy="${ey}" r="6" fill="#fff" stroke="${INK}" stroke-width=".45" stroke-dasharray="1.5 1"/>`;
  const holes = { "🦊": [[x + 30, y + 47], [x + 62, y + 47]], "🐰": [[x + 31, y + 52], [x + 61, y + 52]], "🐻": [[x + 31, y + 44], [x + 61, y + 44]], "🦉": [[x + 29, y + 42], [x + 63, y + 42]] }[ch];
  return emojiAt(ch, x, y, s) + holes.map(h => eye(...h)).join("") +
    `<rect x="${x - 26}" y="${y + 38}" width="26" height="14" rx="3" fill="#fff3c4" stroke="${INK}" stroke-width=".45"/><circle cx="${x - 19}" cy="${y + 45}" r="1.6" fill="none" stroke="${INK}" stroke-width=".45"/>` +
    `<rect x="${x + s}" y="${y + 38}" width="26" height="14" rx="3" fill="#fff3c4" stroke="${INK}" stroke-width=".45"/><circle cx="${x + s + 19}" cy="${y + 45}" r="1.6" fill="none" stroke="${INK}" stroke-width=".45"/>` +
    `<rect x="${x - 28}" y="${y - 4}" width="${s + 56}" height="${s + 8}" rx="40" fill="none" stroke="${INK}" stroke-width=".45"/>` + txt(x - 26, y - 7, `Маска «${name}»: виріж по лінії, очі — з дорослим`, 3.8);
}
function maskPage(n, a, b) {
  let s = header("Маски для свята", "Наклей на картон, виріж очі й протягни гумку в дірочки", C.sun, n);
  let g = mask(SAFE + 49, 42, ...a) + mask(SAFE + 49, 164, ...b) + legend(PAGE.h - 14);
  return page(s + svgPage(g) + footer("Паперове містечко", `аркуш ${n}`), { bg: "#fffdf9" });
}

/* ---------- 15–16. Містечко ---------- */
function road(x, y, w) { let r = `<rect x="${x}" y="${y}" width="${w}" height="26" fill="#6b6f7a"/>`; for (let i = 0; i < w / 14; i++) r += `<rect x="${x + 3 + i * 14}" y="${y + 12}" width="8" height="2" fill="#fff"/>`; return r + cutRect(x, y, w, 26, 0); }
function townPage(n, houses, cars, roads) {
  let s = header("Містечко Тямка", "Виріж будинки й машинки на підставках, а дороги склади в одну вулицю", C.sky, n);
  let g = "";
  houses.forEach((h, i) => { g += stand(SAFE + (i % 2) * 96, 34 + Math.floor(i / 2) * 92, 92, 76, h[0], h[1], h[2]); });
  cars.forEach((c, i) => { g += stand(SAFE + i * 39, 34 + Math.ceil(houses.length / 2) * 92, 35, 30, c[0], c[1], "#f2f6ff"); });
  for (let i = 0; i < roads; i++) g += road(SAFE, 230 + i * 30, PAGE.w - 2 * SAFE);
  g += legend(PAGE.h - 14);
  return page(s + svgPage(g) + footer("Паперове містечко", `аркуш ${n}`), { bg: "#fffdf9" });
}

async function build() {
  const pages = [];
  // обкладинка конверта
  pages.push(page(`<div style="position:absolute;inset:0;background:linear-gradient(160deg,#c6b3ff,#8f6bff)"></div>
    <div class="safe" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;gap:6mm">
      <div style="font-size:8mm;font-weight:900;letter-spacing:.5mm">ТЯМКО</div>
      ${L.emoji("✂️", 50)}<h1 style="font-size:18mm">Паперове<br>містечко</h1>
      <div style="font-size:6mm;font-weight:800;background:#fff;color:#8f6bff;border-radius:20mm;padding:2mm 8mm">16 аркушів вирізалок · 4–8 років</div>
      <div style="display:flex;gap:3mm">${["🏡", "👗", "🐄", "🍩", "🦊", "🚌"].map(c => L.emoji(c, 15)).join("")}</div>
      <div style="font-size:4mm;font-weight:700;max-width:150mm">Будиночок · ляльки у вишиванках · ферма · сквіші · маски · містечко<br>Ножиці — під наглядом дорослих</div>
      <div style="font-size:3mm;opacity:.9">${L.CREDIT}</div>
    </div>`));
  ROOMS.forEach((r, i) => pages.push(room(i + 1, ...r)));
  DOLLS.forEach((d, i) => pages.push(dollPage(5 + i, d)));
  pages.push(farmPage(9, [["🐄", "Корова", "#eaf6e2"], ["🐖", "Свинка", "#ffe9ef"], ["🐑", "Овечка", "#eef4ff"], ["🐓", "Півник", "#fff4dc"], ["🐐", "Кізонька", "#f2efe9"], ["🐎", "Конячка", "#fdeee3"]]));
  pages.push(farmPage(10, [["🦆", "Качечка", "#e3f3ff"], ["🐇", "Зайчик", "#f3efff"], ["🐕", "Песик", "#fff4dc"], ["🐈", "Котик", "#ffeede"]], fence(SAFE + 66, 160) + fence(SAFE + 66, 214)));
  pages.push(squishyPage(11, ["Пончик", "Котик"], ["#ffc93c", "#e5383b", "Корона королеви: виріж, склей у кільце"]));
  pages.push(squishyPage(12, ["Хмаринка", "Вареник"], ["#9b7bff", "#ffc93c", "Корона короля: виріж, склей у кільце"]));
  pages.push(maskPage(13, ["🦊", "Лисичка"], ["🐰", "Зайчик"]));
  pages.push(maskPage(14, ["🐻", "Ведмедик"], ["🦉", "Тямко"]));
  pages.push(townPage(15, [["🏪", "Магазин", "#fff4dc"], ["🏫", "Школа", "#eaf6e2"]], [["🚗", "Авто"], ["🚌", "Автобус"], ["🚕", "Таксі"], ["🚲", "Ровер"]], 2));
  pages.push(townPage(16, [["🏣", "Пошта", "#eef4ff"], ["🏥", "Лікарня", "#ffeef0"]], [["🚒", "Пожежна"], ["🚑", "Швидка"], ["🚜", "Трактор"], ["🛵", "Мопед"]], 2));
  await L.render("mistechko", L.doc("Паперове містечко", pages));
}
module.exports = { build };
if (require.main === module) build().then(L.done).catch(e => { console.error(e); process.exit(1); });
