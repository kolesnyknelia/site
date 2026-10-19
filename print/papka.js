/* =========================================================
   «Велика розвивальна папка Тямко» — макети для друку
   Вихід (print/out/):
     papka_1_storinky.pdf        32 сторінки завдань (16 аркушів, друк 4+4, ламінування)
     papka_2_detali.pdf          аркуші деталей на липучках (друк 4+0, ламінування, висічка)
     papka_2_detali_VYSICHKA.pdf контури висічки деталей
     papka_3_oblozhka.pdf        обкладинка: лицьова + зворотна сторона
     papka_4_vkladysh.pdf        вкладиш-інструкція A5
   ========================================================= */
"use strict";
const L = require("./lib");
const { emoji, emojiInner, header, footer, page, esc, SAFE, PAGE, COLORS: C } = L;

L.ensureAssets();
const CX = SAFE, CY = 36, CW = PAGE.w - 2 * SAFE;          // робоча зона під шапкою
const SLOT = 32, TILE = 30;

/* ---------- Будівельні блоки ---------- */
const A = (x, y, w, h, inner = "", style = "") =>
  `<div style="position:absolute;left:${x}mm;top:${y}mm;width:${w}mm;height:${h}mm;${style}">${inner}</div>`;
const T = (x, y, w, text, size = 5, style = "") =>
  A(x, y, w, size * 1.4, esc(text), `font-size:${size}mm;font-weight:800;${style}`);

/** Місце для деталі: пунктирний квадрат + кружечок «липучка». ghost — підказка блідо */
function slot(x, y, ghost = "", color = "#c9bfd9") {
  return A(x, y, SLOT, SLOT,
    (ghost ? `<div style="position:absolute;inset:0;display:grid;place-items:center;opacity:.16">${ghost}</div>` : "") +
    `<div style="position:absolute;left:50%;top:50%;width:13mm;height:13mm;margin:-6.5mm;border-radius:50%;background:#f1ecf7;border:.3mm solid #e2daee"></div>`,
    `border:.7mm dashed ${color};border-radius:4mm;background:#fff`);
}

/* Деталі: реєструються сторінками, потім розкладаються на аркуші */
const PIECES = [];
function piece(content, pageNo, color = C.line) { PIECES.push({ content, pageNo, color }); }

const big = (t, color = C.ink, size = 20) => `<div style="font-size:${size}mm;font-weight:900;color:${color};line-height:1">${esc(t)}</div>`;
const circle = (color, d = 20) => `<div style="width:${d}mm;height:${d}mm;border-radius:50%;background:${color}"></div>`;
const shapeSvg = (kind, fill, stroke = "none", sw = 0, size = 22) => {
  const p = {
    kolo: `<circle cx="50" cy="50" r="44"/>`,
    kvadrat: `<rect x="8" y="8" width="84" height="84" rx="4"/>`,
    trykutnyk: `<polygon points="50,6 95,90 5,90"/>`,
    zirka: `<polygon points="50,4 61,37 96,37 68,58 79,92 50,71 21,92 32,58 4,37 39,37"/>`,
    sertse: `<path d="M50 90 C10 60 2 38 16 22 C28 9 45 14 50 28 C55 14 72 9 84 22 C98 38 90 60 50 90Z"/>`,
    oval: `<ellipse cx="50" cy="50" rx="46" ry="30"/>`,
    pryamokutnyk: `<rect x="22" y="6" width="56" height="88" rx="4"/>`,
    romb: `<polygon points="50,4 94,50 50,96 6,50"/>`
  }[kind];
  return `<svg viewBox="0 0 100 100" style="width:${size}mm;height:${size}mm" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${stroke !== "none" ? 'stroke-dasharray="7 5"' : ""}>${p}</svg>`;
};
/** Силует: усі кольори емодзі → один темний колір (векторно) */
const silhouette = (ch, size) => `<svg class="em" viewBox="0 0 36 36" style="width:${size}mm;height:${size}mm">${emojiInner(ch).replace(/fill="#[0-9a-fA-F]{3,6}"/g, 'fill="#3d3452"')}</svg>`;
/** Половинка емодзі: side = "l" | "r" */
const half = (ch, size, side) => `<svg class="em" viewBox="${side === "l" ? "0" : "18"} 0 18 36" style="width:${size / 2}mm;height:${size}mm">${emojiInner(ch)}</svg>`;
/** Цифри/літери для обведення маркером: пунктирний контур */
const traceText = (t, size, color = "#8f86a6") =>
  `<svg viewBox="0 0 ${size * 0.75 * t.length} ${size}" style="height:${size}mm;overflow:visible"><text x="0" y="${size * 0.82}" font-family="Nunito" font-weight="900" font-size="${size}" fill="none" stroke="${color}" stroke-width="${size / 45}" stroke-dasharray="${size / 22} ${size / 30}" stroke-linecap="round">${esc(t)}</text></svg>`;

/** Ряд: підпис/картинка зліва + місця для деталей справа */
function rowSlots(y, leftHtml, slots, opts = {}) {
  const lw = opts.lw || 58, h = opts.h || 42;
  let out = A(CX, y, CW, h, "", `border-radius:6mm;background:${opts.bg || "#faf6ff"}`);
  out += A(CX + 3, y + 2, lw, h - 4, leftHtml, "display:flex;align-items:center;gap:3mm");
  slots.forEach((s, i) => { out += slot(CX + lw + 8 + i * (SLOT + 4), y + (h - SLOT) / 2, s.ghost || "", s.color); });
  return out;
}

/* ---------- Сторінки ---------- */
const PAGES = [];
function P(title, sub, color, body, n) { PAGES.push({ title, sub, color, body, n }); }

function sortPage(n, title, sub, color, groups, opts = {}) {
  const h = opts.h || Math.min(46, (250 - (groups.length - 1) * 4) / groups.length);
  let body = "";
  groups.forEach((g, gi) => {
    const y = CY + 4 + gi * (h + 4);
    const left = (g.swatch ? circle(g.swatch, 18) : "") + (g.icon ? emoji(g.icon, 20) : "") +
      `<div style="font-size:6mm;font-weight:900;color:${g.text || C.ink}">${esc(g.label)}</div>`;
    body += rowSlots(y, left, g.items.map(() => ({ color: g.swatch || "#c9bfd9" })), { h, bg: g.bg, lw: opts.lw });
    g.items.forEach(it => piece(typeof it === "string" ? emoji(it, 22) : it, n, g.swatch || C.line));
  });
  P(title, sub, color, body, n);
}

function matchPage(n, title, sub, color, rows, opts = {}) {
  const h = 38;
  let body = "";
  rows.forEach((r, i) => {
    const y = CY + 4 + i * (h + 4);
    const left = (r.leftHtml || emoji(r.left, 30)) + (r.label ? `<div style="font-size:5.2mm;font-weight:900">${esc(r.label)}</div>` : "") +
      `<div style="margin-left:auto;font-size:9mm;color:${C.muted}">→</div>`;
    body += rowSlots(y, left, [{}], { h, lw: opts.lw || 110 });
    piece(r.pieceHtml || emoji(r.piece, 22), n);
  });
  P(title, sub, color, body, n);
}

/* 1–2. Кольори */
sortPage(1, "Кольори", "Приклей кожен предмет до свого кольору", C.coral, [
  { label: "Червоний", swatch: "#e5383b", items: ["🍎", "🍓"] },
  { label: "Жовтий", swatch: "#ffd23f", items: ["🍌", "🌻"] },
  { label: "Зелений", swatch: "#38b000", items: ["🥒", "🐸"] },
  { label: "Синій", swatch: "#2f6fe4", items: ["🫐", "🐳"] },
  { label: "Помаранчевий", swatch: "#ff8c1a", items: ["🥕", "🍊"] }
]);
sortPage(2, "Кольори", "Ще 5 кольорів: знайди предметам пару", C.coral, [
  { label: "Фіолетовий", swatch: "#8e44ad", items: ["🍇", "🍆"] },
  { label: "Рожевий", swatch: "#ff7eb6", items: ["🌸", "🐷"] },
  { label: "Коричневий", swatch: "#8b5a2b", items: ["🐻", "🌰"] },
  { label: "Білий", swatch: "#f4f4f4", items: ["🥚", "☁️"] },
  { label: "Чорний", swatch: "#2b2b2b", items: ["🎩", "🐈‍⬛"] }
]);

/* 3. Веселка */
{
  const cols = [["Червоний", "#e5383b", "❤️"], ["Помаранчевий", "#ff8c1a", "🧡"], ["Жовтий", "#ffd23f", "💛"], ["Зелений", "#38b000", "💚"],
    ["Блакитний", "#4cc9f0", "🩵"], ["Синій", "#2f6fe4", "💙"], ["Фіолетовий", "#8e44ad", "💜"]];
  let arcs = "";
  cols.forEach((c, i) => { const r = 88 - i * 9; arcs += `<path d="M ${95 - r} 95 A ${r} ${r} 0 0 1 ${95 + r} 95" stroke="${c[1]}" stroke-width="9" fill="none"/>`; });
  let body = A(CX, CY, CW, 100, `<svg viewBox="0 0 190 100" style="width:100%;height:100%">${arcs}</svg>`);
  body += A(CX + 70, CY + 72, 50, 24, emoji("☁️", 22) + emoji("☁️", 18), "display:flex;justify-content:center");
  cols.forEach((c, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = CX + (row ? 24 : 0) + col * 47, y = CY + 108 + row * 66;
    body += slot(x + 5, y, "", c[1]) + T(x - 2, y + 35, 46, c[0], 4.4, `text-align:center;color:${c[1] === "#ffd23f" ? "#b38f00" : c[1]}`);
    piece(emoji(c[2], 22), 3, c[1]);
  });
  P("Веселка", "Розклади сердечка за кольорами веселки", C.coral, body, 3);
}

/* 4. Форми */
{
  const forms = [["kolo", "Коло", "#ff7a59"], ["kvadrat", "Квадрат", "#5b9dff"], ["trykutnyk", "Трикутник", "#4fc29f"],
    ["zirka", "Зірка", "#ffc93c"], ["sertse", "Серце", "#ff8fb1"], ["oval", "Овал", "#9b7bff"]];
  let body = "";
  forms.forEach((f, i) => {
    const x = CX + (i % 2) * 97, y = CY + 4 + Math.floor(i / 2) * 82;
    body += A(x, y, 93, 76, "", "border-radius:6mm;background:#faf6ff");
    body += A(x + 4, y + 8, 44, 60, shapeSvg(f[0], "none", f[2], 4, 36) + `<div style="font-size:5.2mm;font-weight:800">${f[1]}</div>`, "display:flex;flex-direction:column;align-items:center;gap:2mm");
    body += slot(x + 54, y + 22, shapeSvg(f[0], f[2], "none", 0, 24), f[2]);
    piece(shapeSvg(f[0], f[2], "none", 0, 24), 4, f[2]);
  });
  P("Форми", "Знайди фігуру такої самої форми", C.sky, body, 4);
}

/* 5. Будиночок з фігур */
{
  let body = A(CX, CY, CW, 250, `<svg viewBox="0 0 190 250" style="width:100%;height:100%">
    <rect x="0" y="210" width="190" height="40" rx="6" fill="#c7efcf"/>
    <polygon points="95,30 30,92 160,92" fill="#ffe1d6" stroke="#ff7a59" stroke-width="1.2" stroke-dasharray="3 2"/>
    <rect x="38" y="92" width="114" height="118" fill="#fff4dc" stroke="#e8b04a" stroke-width="1.2" stroke-dasharray="3 2"/>
  </svg>`);
  const sl = [[CX + 79, CY + 52, "trykutnyk", "#e5383b"], [CX + 47, CY + 104, "kvadrat", "#5b9dff"], [CX + 111, CY + 104, "kvadrat", "#5b9dff"],
    [CX + 79, CY + 172, "pryamokutnyk", "#8b5a2b"], [CX + 150, CY + 6, "kolo", "#ffc93c"]];
  sl.forEach(s => { body += slot(s[0], s[1], shapeSvg(s[2], s[3], "none", 0, 24), s[3]); piece(shapeSvg(s[2], s[3], "none", 0, 24), 5, s[3]); });
  body += slot(CX + 8, CY + 178, emoji("🌳", 26)); piece(emoji("🌳", 24), 5);
  P("Будиночок з фігур", "Добудуй дім для Тямка: дах, вікна, двері, сонце й дерево", C.sky, body, 5);
}

/* 6–7. Порахуй */
const DIG = ["#ff7a59", "#5b9dff", "#4fc29f", "#9b7bff", "#ffb020"];
function countPage(n, from, items) {
  let body = "";
  items.forEach((ch, i) => {
    const k = from + i, y = CY + 4 + i * 50, sz = k <= 5 ? 16 : 12.5;
    const objs = Array.from({ length: k }, () => emoji(ch, sz)).join("");
    body += A(CX, y, CW, 46, "", "border-radius:6mm;background:#faf6ff");
    body += A(CX + 4, y + 3, 128, 40, objs, `display:flex;flex-wrap:wrap;align-content:center;gap:1.5mm;${k > 5 ? "width:" + (5 * (sz + 1.5)) + "mm" : ""}`);
    body += slot(CX + 150, y + 7);
    piece(big(String(k), DIG[i % 5]), n, DIG[i % 5]);
  });
  P("Порахуй", `Скільки предметів? Приклей потрібну цифру (${from}–${from + 4})`, C.mint, body, n);
}
countPage(6, 1, ["🍎", "🐞", "🌼", "🐟", "🧸"]);
countPage(7, 6, ["⭐", "🍓", "🐥", "🍪", "🎈"]);

/* 8. Гусениця */
{
  let body = "";
  const miss = [2, 4, 5, 7, 9];
  for (let i = 1; i <= 10; i++) {
    const row = i <= 5 ? 0 : 1, col = row ? 10 - i : i - 1;      // змійкою
    const x = CX + 6 + col * 36, y = CY + 60 + row * 70;
    if (miss.includes(i)) { body += slot(x, y, "", "#7cc96b"); piece(big(String(i), "#3f8f2f"), 8, "#7cc96b"); }
    else body += A(x, y, 32, 32, big(String(i), "#fff", 16), "border-radius:50%;background:#7cc96b;display:grid;place-items:center");
  }
  body += A(CX + 150, CY + 8, 40, 40, emoji("🐛", 36));
  body += A(CX, CY + 175, CW, 70, emoji("🍃", 22) + emoji("🌿", 22) + emoji("🍏", 22) + emoji("🌸", 22), "display:flex;justify-content:space-around;align-items:center");
  P("Гусениця 1–10", "Допоможи гусениці: приклей цифри, яких не вистачає", C.mint, body, 8);
}

/* 9. Обведи цифри */
{
  let body = "";
  for (let d = 0; d <= 9; d++) {
    const x = CX + (d % 2) * 97, y = CY + 4 + Math.floor(d / 2) * 50;
    body += A(x, y, 93, 46, traceText(String(d), 38) + `<div style="display:flex;flex-wrap:wrap;gap:1.2mm;width:40mm">${Array.from({ length: d }, () => `<span style="width:6mm;height:6mm;border-radius:50%;background:${DIG[d % 5]};display:inline-block"></span>`).join("")}</div>`,
      "display:flex;align-items:center;gap:6mm;padding-left:6mm;border-radius:6mm;background:#faf6ff");
  }
  P("Обведи цифри", "Маркером по пунктиру. Порахуй кружечки", C.mint, body, 9);
}

/* 10–12. Абетка */
const ABC = [["А", "ананас", "🍍"], ["Б", "банан", "🍌"], ["В", "виноград", "🍇"], ["Г", "гриб", "🍄"], ["Ґ", "ґудзик", "🔘"], ["Д", "дельфін", "🐬"],
  ["Е", "ескімо", "🍦"], ["Є", "єнот", "🦝"], ["Ж", "жираф", "🦒"], ["З", "заєць", "🐇"], ["И", "кит", "🐋"], ["І", "індик", "🦃"],
  ["Ї", "їжак", "🦔"], ["Й", "йогурт", "🥣"], ["К", "кіт", "🐈"], ["Л", "лев", "🦁"], ["М", "метелик", "🦋"], ["Н", "носоріг", "🦏"],
  ["О", "олівець", "✏️"], ["П", "півень", "🐓"], ["Р", "риба", "🐟"], ["С", "сова", "🦉"], ["Т", "тигр", "🐅"], ["У", "удав", "🐍"],
  ["Ф", "фламінго", "🦩"], ["Х", "хліб", "🍞"], ["Ц", "цибуля", "🧅"], ["Ч", "черепаха", "🐢"], ["Ш", "шапка", "🧢"], ["Щ", "щеня", "🐶"],
  ["Ь", "кінь", "🐴"], ["Ю", "брюки", "👖"], ["Я", "яблуко", "🍎"]];
const LET = ["#ff7a59", "#5b9dff", "#4fc29f", "#9b7bff", "#ff8fb1", "#ffb020"];
[0, 11, 22].forEach((start, pi) => {
  const n = 10 + pi; let body = "";
  ABC.slice(start, start + 11).forEach(([l, w, ch], i) => {
    const x = CX + (i % 3) * 64, y = CY + 2 + Math.floor(i / 3) * 63, col = LET[(start + i) % 6];
    const word = w.replace(new RegExp(l.toLowerCase()), m => `<b style="color:${col}">${m}</b>`);
    body += A(x, y, 61, 60, "", "border-radius:5mm;background:#faf6ff");
    body += A(x + 2, y + 2, 25, 56, emoji(ch, 20) + `<div style="font-size:4.4mm;font-weight:800;text-align:center">${word}</div>`, "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm");
    body += slot(x + 27, y + 14, big(l, col, 18), col);
    piece(big(l + l.toLowerCase(), col, 14), n, col);
  });
  if (pi < 2) body += A(CX + 128, CY + 2 + 3 * 63, 61, 60, emoji("🦉", 26) + `<div style="font-size:4mm;font-weight:800;text-align:center">Приклей літеру,<br>з якої починається<br>або яка є в слові</div>`, "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm");
  P("Абетка", `Літери ${ABC[start][0]}–${ABC[Math.min(start + 10, 32)][0]}: знайди літеру для кожної картинки`, C.lilac, body, n);
});

/* 13. Обведи літери */
{
  let body = "";
  ["Аа", "Бб", "Вв", "Гг", "Дд", "Ее", "Єє", "Жж"].forEach((l, i) => {
    const x = CX + (i % 2) * 97, y = CY + 4 + Math.floor(i / 2) * 62;
    body += A(x, y, 93, 58, traceText(l, 40), "display:flex;align-items:center;justify-content:center;border-radius:6mm;background:#faf6ff");
  });
  P("Обведи літери", "Маркером по пунктиру: велика і маленька літера", C.lilac, body, 13);
}

/* 14. Хто де живе */
sortPage(14, "Хто де живе", "Приклей тварин туди, де вони живуть", C.mint, [
  { label: "Ліс", icon: "🌲", bg: "#e6f6e9", items: ["🦊", "🐻", "🐿️"] },
  { label: "Ферма", icon: "🚜", bg: "#fff4dc", items: ["🐄", "🐖", "🐓"] },
  { label: "Море", icon: "🌊", bg: "#e3f1ff", items: ["🐬", "🐙", "🐠"] },
  { label: "Гори", icon: "🏔️", bg: "#efeaf9", items: ["🐑", "🦌", "🦅"] }
], { h: 58, lw: 52 });

/* 15. Хто що їсть */
matchPage(15, "Хто що їсть", "Нагодуй кожну тварину", C.mint, [
  { left: "🐇", label: "Зайчик", piece: "🥕" }, { left: "🐿️", label: "Білочка", piece: "🌰" }, { left: "🐒", label: "Мавпочка", piece: "🍌" },
  { left: "🐄", label: "Корова", piece: "🌾" }, { left: "🐈", label: "Котик", piece: "🐟" }, { left: "🐻", label: "Ведмедик", piece: "🍯" }
]);

/* 16. Тіні */
matchPage(16, "Чия тінь?", "Знайди, кому належить тінь", C.sky, ["🐘", "🦒", "🐢", "🦋", "🐌", "🦕"].map(ch => ({ leftHtml: silhouette(ch, 30), piece: ch })));

/* 17. Дерево і грядка */
sortPage(17, "Де що росте?", "На дереві чи на грядці?", C.mint, [
  { label: "На дереві", icon: "🌳", bg: "#e6f6e9", items: ["🍎", "🍐", "🍒"] },
  { label: "На грядці", icon: "🧑‍🌾", bg: "#fff4dc", items: ["🥕", "🥔", "🧅"] }
], { h: 80, lw: 52 });

/* 18. Погода */
sortPage(18, "Одягни Тямка за погодою", "Що потрібно взяти в таку погоду?", C.sky, [
  { label: "Спека", icon: "☀️", bg: "#fff4dc", items: ["🕶️", "🩳"] },
  { label: "Дощ", icon: "🌧️", bg: "#e3f1ff", items: ["☂️", "👢"] },
  { label: "Мороз", icon: "❄️", bg: "#eef4ff", items: ["🧤", "🧣"] },
  { label: "Вітер", icon: "🍂", bg: "#fdeee3", items: ["🧥", "🧢"] }
], { h: 58, lw: 60 });

/* 19. Пори року */
sortPage(19, "Пори року", "Що буває взимку, навесні, влітку й восени?", C.coral, [
  { label: "Зима", icon: "⛄", bg: "#eef4ff", items: ["🛷", "🎄"] },
  { label: "Весна", icon: "🌷", bg: "#e6f6e9", items: ["🐣", "🌱"] },
  { label: "Літо", icon: "🌞", bg: "#fff4dc", items: ["🍉", "🏖️"] },
  { label: "Осінь", icon: "🍁", bg: "#fdeee3", items: ["🍄", "🎃"] }
], { h: 58, lw: 60 });

/* 20. Склади обличчя */
{
  let body = A(CX, CY, CW, 250, `<svg viewBox="0 0 190 250" style="width:100%;height:100%">
    <ellipse cx="95" cy="130" rx="72" ry="92" fill="#ffe0bd"/>
    <path d="M28 95 C30 30 160 30 162 95 C150 60 40 60 28 95Z" fill="#8b5a2b"/>
  </svg>`);
  [[CX + 40, CY + 92, "👁️"], [CX + 118, CY + 92, "👁️"], [CX + 79, CY + 132, "👃"], [CX + 79, CY + 180, "👄"], [CX - 2, CY + 120, "👂"], [CX + 160, CY + 120, "👂"]]
    .forEach(s => { body += slot(s[0], s[1]); piece(emoji(s[2], 22), 20); });
  P("Склади обличчя", "Очі, ніс, рот і вушка: приклей на свої місця", C.pink, body, 20);
}

/* 21. Корисно для зубів */
sortPage(21, "Що корисно для зубів?", "Розклади: корисно чи шкідливо", C.pink, [
  { label: "Корисно", icon: "😁", bg: "#e6f6e9", items: ["🍎", "🥕", "🥛"] },
  { label: "Шкідливо", icon: "😖", bg: "#fdeaea", items: ["🍭", "🍬", "🥤"] }
], { h: 80, lw: 52 });

/* 22. Продовж ряд */
{
  const rows = [["🍎", "🍌"], ["🔴", "🔵"], ["⭐", "🌙"], ["🐱", "🐶", "🐭"]];
  let body = "";
  rows.forEach((r, i) => {
    const y = CY + 4 + i * 62;
    const seq = Array.from({ length: 4 }, (_, k) => r[k % r.length]);
    const next = [r[4 % r.length], r[5 % r.length]];
    body += A(CX, y, CW, 56, "", "border-radius:6mm;background:#faf6ff");
    body += A(CX + 3, y + 3, 110, 50, seq.map(ch => emoji(ch, 22)).join(""), "display:flex;align-items:center;gap:4mm");
    body += slot(CX + 114, y + 12) + slot(CX + 152, y + 12);
    next.forEach(ch => piece(emoji(ch, 22), 22));
  });
  P("Продовж ряд", "Що буде далі? Приклей дві наступні картинки", C.lilac, body, 22);
}

/* 23. Що зайве */
{
  const rows = [["🍎", "🍐", "🍌", "🚗"], ["🐶", "🐱", "✈️", "🐰"], ["🌷", "🔨", "🌻", "🌹"], ["🚌", "🚲", "🍰", "🚂"], ["⚽", "🏀", "🎾", "🥕"]];
  let body = "";
  rows.forEach((r, i) => {
    body += A(CX, CY + 4 + i * 50, CW, 46, r.map(ch => `<div style="width:40mm;height:40mm;border-radius:5mm;background:#fff;display:grid;place-items:center">${emoji(ch, 28)}</div>`).join(""),
      "display:flex;justify-content:space-around;align-items:center;border-radius:6mm;background:#faf6ff");
  });
  P("Що зайве?", "Закресли маркером зайву картинку в кожному ряду", C.lilac, body, 23);
}

/* 24. Від меншого до більшого */
{
  let body = A(CX, CY + 4, CW, 60, [10, 14, 18, 22, 27].map(s => emoji("🐻", s)).join(""), "display:flex;align-items:flex-end;justify-content:space-around;border-radius:6mm;background:#faf6ff;padding-bottom:5mm");
  body += T(CX, CY + 74, CW, "А тепер ти: розклади яблука від найменшого до найбільшого", 4.8, "text-align:center");
  for (let i = 0; i < 5; i++) {
    body += slot(CX + 2 + i * 38, CY + 100);
    body += T(CX + 2 + i * 38, CY + 134, 32, String(i + 1), 6, `text-align:center;color:${C.muted}`);
    piece(emoji("🍎", 9 + i * 3.4), 24);
  }
  body += A(CX, CY + 160, CW, 80, emoji("🐁", 14) + emoji("🐈", 22) + emoji("🐕", 30) + emoji("🐎", 40), "display:flex;align-items:flex-end;justify-content:space-around");
  P("Від меншого до більшого", "Розклади по порядку", C.lilac, body, 24);
}

/* 25. Половинки */
matchPage(25, "Половинки", "Знайди другу половинку кожної картинки", C.sky,
  ["🍉", "🦋", "🍓", "🐞", "🌼", "🐙"].map(ch => ({ leftHtml: half(ch, 30, "l"), pieceHtml: half(ch, 22, "r") })), { lw: 110 });

/* 26. Лабіринт */
{
  const cols = 11, rows = 13, cell = 16, r = L.rng(26);
  const vis = Array.from({ length: rows }, () => Array(cols).fill(false));
  const walls = { h: Array.from({ length: rows + 1 }, () => Array(cols).fill(true)), v: Array.from({ length: rows }, () => Array(cols + 1).fill(true)) };
  const stack = [[0, 0]]; vis[0][0] = true;
  while (stack.length) {
    const [y, x] = stack[stack.length - 1];
    const nb = [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]].filter(([a, b]) => a >= 0 && b >= 0 && a < rows && b < cols && !vis[a][b]);
    if (!nb.length) { stack.pop(); continue; }
    const [ny, nx] = nb[Math.floor(r() * nb.length)];
    if (ny !== y) walls.h[Math.max(y, ny)][x] = false; else walls.v[y][Math.max(x, nx)] = false;
    vis[ny][nx] = true; stack.push([ny, nx]);
  }
  walls.v[0][0] = false; walls.v[rows - 1][cols] = false;
  let ln = "";
  walls.h.forEach((row, y) => row.forEach((w, x) => { if (w) ln += `<line x1="${x * cell}" y1="${y * cell}" x2="${(x + 1) * cell}" y2="${y * cell}"/>`; }));
  walls.v.forEach((row, y) => row.forEach((w, x) => { if (w) ln += `<line x1="${x * cell}" y1="${y * cell}" x2="${x * cell}" y2="${(y + 1) * cell}"/>`; }));
  const W = cols * cell, H = rows * cell;
  let body = A(CX + (CW - W) / 2, CY + 26, W, H, `<svg viewBox="-2 -2 ${W + 4} ${H + 4}" style="width:100%;height:100%"><g stroke="#6b5fa0" stroke-width="2.2" stroke-linecap="round">${ln}</g></svg>`);
  body += A(CX - 2, CY + 2, 30, 26, emoji("🦉", 22) + "→", "font-size:8mm;display:flex;align-items:center");
  body += A(CX + CW - 26, CY + 26 + H - 4, 28, 26, emoji("🪺", 22));
  P("Лабіринт", "Допоможи Тямку дістатися до гнізда. Веди маркером", C.lilac, body, 26);
}

/* 27. Доріжки */
{
  const items = [["🐝", "🌼", "M0 20 Q 15 0 30 20 T 60 20 T 90 20 T 120 20"], ["🐭", "🧀", "M0 20 L15 5 L30 35 L45 5 L60 35 L75 5 L90 35 L105 5 L120 20"],
    ["🐰", "🥕", "M0 30 C 20 -10, 40 50, 60 10 S 100 40, 120 10"], ["🐶", "🦴", "M0 20 L30 20 L30 5 L60 5 L60 35 L90 35 L90 20 L120 20"], ["🐸", "🪷", "M0 30 Q 30 -15 60 25 Q 90 60 120 10"]];
  let body = "";
  items.forEach((it, i) => {
    const y = CY + 4 + i * 50;
    body += A(CX, y, CW, 46, "", "border-radius:6mm;background:#faf6ff");
    body += A(CX + 3, y + 5, 36, 36, emoji(it[0], 32));
    body += A(CX + 40, y + 3, 112, 40, `<svg viewBox="-3 -3 126 46" style="width:100%;height:100%"><path d="${it[2]}" fill="none" stroke="#8f86a6" stroke-width="2.2" stroke-dasharray="3 3" stroke-linecap="round"/></svg>`);
    body += A(CX + 152, y + 5, 36, 36, emoji(it[1], 32));
  });
  P("Доріжки", "Проведи маркером по доріжці від тваринки до смаколика", C.lilac, body, 27);
}

/* 28. Обведи по лініях */
{
  const f = ["kolo", "kvadrat", "trykutnyk", "zirka", "sertse", "romb"];
  let body = "";
  f.forEach((k, i) => { body += A(CX + (i % 3) * 64, CY + 4 + Math.floor(i / 3) * 64, 60, 60, shapeSvg(k, "none", "#8f86a6", 3.5, 48), "display:grid;place-items:center;border-radius:6mm;background:#faf6ff"); });
  body += A(CX, CY + 136, CW, 54, `<svg viewBox="0 0 190 50" style="width:100%;height:100%"><path d="M5 25 Q 17 5 29 25 T 53 25 T 77 25 T 101 25 T 125 25 T 149 25 T 173 25 T 185 25" fill="none" stroke="#8f86a6" stroke-width="1.6" stroke-dasharray="2.5 2.5" stroke-linecap="round"/></svg>`, "border-radius:6mm;background:#faf6ff");
  body += A(CX, CY + 196, CW, 54, `<svg viewBox="0 0 190 50" style="width:100%;height:100%"><path d="M5 40 ${Array.from({ length: 12 }, (_, i) => `L${15 + i * 15} ${i % 2 ? 40 : 10}`).join(" ")}" fill="none" stroke="#8f86a6" stroke-width="1.6" stroke-dasharray="2.5 2.5" stroke-linecap="round"/></svg>`, "border-radius:6mm;background:#faf6ff");
  P("Обведи по лініях", "Тренуємо руку до письма: веди маркером по пунктиру", C.lilac, body, 28);
}

/* 29. Професії */
matchPage(29, "Кому що потрібно?", "Дай кожному інструмент для роботи", C.coral, [
  { left: "🧑‍🍳", label: "Кухар", piece: "🍳" }, { left: "🧑‍🚒", label: "Рятувальник", piece: "🧯" }, { left: "🧑‍⚕️", label: "Лікар", piece: "🩺" },
  { left: "🧑‍🌾", label: "Фермер", piece: "🚜" }, { left: "🧑‍🏫", label: "Вчителька", piece: "📚" }, { left: "👮", label: "Поліцейський", piece: "🚓" }
]);

/* 30. Транспорт */
sortPage(30, "Транспорт", "Що їздить, що плаває, а що літає?", C.coral, [
  { label: "Їздить", icon: "🛣️", bg: "#f3efe9", items: ["🚗", "🚌", "🚲"] },
  { label: "Плаває", icon: "🌊", bg: "#e3f1ff", items: ["🚢", "⛵", "🛶"] },
  { label: "Літає", icon: "☁️", bg: "#eef4ff", items: ["✈️", "🚁", "🎈"] }
], { h: 74, lw: 52 });

/* 31. Годинник і тиждень */
{
  let ticks = "";
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; ticks += `<line x1="${60 + 50 * Math.sin(a)}" y1="${60 - 50 * Math.cos(a)}" x2="${60 + 56 * Math.sin(a)}" y2="${60 - 56 * Math.cos(a)}" stroke="#6b5fa0" stroke-width="2.4" stroke-linecap="round"/>`; }
  let body = A(CX + 35, CY + 4, 120, 120, `<svg viewBox="0 0 120 120" style="width:100%;height:100%"><circle cx="60" cy="60" r="58" fill="#fff4dc" stroke="#ffb020" stroke-width="3"/>${ticks}<line x1="60" y1="60" x2="60" y2="30" stroke="#2b2240" stroke-width="3.5" stroke-linecap="round"/><line x1="60" y1="60" x2="82" y2="60" stroke="#ff7a59" stroke-width="2.5" stroke-linecap="round"/><circle cx="60" cy="60" r="4" fill="#2b2240"/></svg>`);
  [["12", 79, 10], ["3", 117, 48], ["6", 79, 86], ["9", 41, 48]].forEach(([t, x, y]) => { body += slot(CX + x - 16 + 0, CY + y, big(t, C.ink, 14)); piece(big(t, "#ffb020", 16), 31, "#ffb020"); });
  const days = ["Понеділок", "Вівторок", "Середа", "Четвер", "Пʼятниця", "Субота", "Неділя"];
  body += T(CX, CY + 134, CW, "Тиждень Тямка: прочитай дні тижня по черзі", 4.8, "text-align:center");
  days.forEach((d, i) => { body += A(CX + (i % 4) * 48 + (i >= 4 ? 24 : 0), CY + 148 + Math.floor(i / 4) * 30, 44, 24, esc(d), `border-radius:12mm;background:${LET[i % 6]};color:#fff;font-weight:900;font-size:4.6mm;display:grid;place-items:center`); });
  body += A(CX, CY + 212, CW, 40, emoji("🌅", 20) + emoji("☀️", 20) + emoji("🌇", 20) + emoji("🌙", 20), "display:flex;justify-content:space-around;align-items:center");
  P("Годинник і тиждень", "Приклей цифри на циферблат", C.sun, body, 31);
}

/* 32. Мої досягнення */
{
  const sections = ["Кольори", "Веселка", "Форми", "Будиночок", "Рахунок", "Гусениця", "Цифри", "Абетка", "Тварини", "Тіні", "Погода", "Пори року", "Обличчя", "Логіка", "Лабіринт", "Професії"];
  let body = "";
  sections.forEach((s, i) => {
    const x = CX + (i % 4) * 48 + 4, y = CY + 4 + Math.floor(i / 4) * 52;
    body += slot(x + 4, y, emoji("⭐", 22), "#ffc93c") + T(x - 2, y + 34, 44, s, 4, "text-align:center");
    piece(emoji("⭐", 24), 32, "#ffc93c");
  });
  body += A(CX, CY + 212, CW, 40, emoji("🦉", 30) + `<div style="font-size:7mm;font-weight:900">Молодець! Ти — справжній тямущик!</div>`, "display:flex;align-items:center;justify-content:center;gap:4mm;border-radius:8mm;background:#fff4dc");
  P("Мої досягнення", "За кожен виконаний розділ — зірочка!", C.sun, body, 32);
}

/* ---------- Збірка ---------- */
async function build() {
  L.ensureAssets();
  // 1. Сторінки
  const pages = PAGES.sort((a, b) => a.n - b.n).map(p =>
    page(header(p.title, p.sub, p.color, p.n) + p.body + L.footer(p.n % 2 ? "Велика розвивальна папка" : "Деталі — у кишені папки", `с. ${p.n}`), { bg: "#fffdf9" }));
  await L.render("papka_1_storinky", L.doc("Папка — сторінки", pages));

  // 2. Деталі: плитки 30×30 мм, 6×8 на аркуші
  const M = 8 + L.BLEED, GAP = 2.5, COLS = 6, ROWS = 8, PER = COLS * ROWS;
  const sheets = [];
  for (let s = 0; s * PER < PIECES.length; s++) {
    let inner = "", cut = [];
    PIECES.slice(s * PER, (s + 1) * PER).forEach((pc, i) => {
      const x = M + (i % COLS) * (TILE + GAP), y = M + Math.floor(i / COLS) * (TILE + GAP);
      inner += A(x - 1, y - 1, TILE + 2, TILE + 2, "", "background:#fff");      // білий «запас» під висічку
      inner += A(x, y, TILE, TILE, `<div style="display:grid;place-items:center;width:100%;height:100%">${pc.content}</div><div style="position:absolute;right:1.5mm;bottom:.8mm;font-size:2.2mm;color:#aaa">с.${pc.pageNo}</div>`,
        `border-radius:3mm;border:.6mm solid ${pc.color};background:#fff`);
      cut.push(`<rect x="${x}" y="${y}" width="${TILE}" height="${TILE}" rx="3"/>`);
    });
    sheets.push(page(inner + L.footer(`Деталі, аркуш ${s + 1}`, `${PIECES.length} деталей · 30×30 мм · висічка за окремим файлом`), { bg: "#f6f1ea", cut }));
  }
  await L.render("papka_2_detali", L.doc("Папка — деталі", sheets), { withCut: true });

  // 3. Обкладинка (лицьова + зворотна)
  const front = page(`
    <div style="position:absolute;inset:0;background:linear-gradient(160deg,#ffb38a,#ff7a59)"></div>
    <div class="safe" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;gap:6mm">
      <div style="font-size:9mm;font-weight:900;letter-spacing:.5mm">ТЯМКО</div>
      ${emoji("🦉", 90)}
      <h1 style="font-size:17mm">Велика<br>розвивальна<br>папка</h1>
      <div style="font-size:6mm;font-weight:800;background:#fff;color:#ff7a59;border-radius:20mm;padding:3mm 8mm">32 сторінки · 200 деталей на липучках</div>
      <div style="display:flex;gap:4mm">${["🎨", "🔢", "🔤", "🦊", "🧩"].map(c => emoji(c, 16)).join("")}</div>
      <div style="font-size:5.5mm;font-weight:800">2–5 років</div>
    </div>`);
  const back = page(`
    <div style="position:absolute;inset:0;background:#fff7ec"></div>
    <div class="safe" style="display:flex;flex-direction:column;gap:5mm">
      <h2 style="font-size:10mm;color:#ff7a59">Що всередині</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3mm;font-size:5mm;font-weight:800">
        ${["🎨 Кольори і веселка", "🔺 Форми", "🔢 Цифри 1–10", "🔤 Абетка: 33 літери", "🦊 Тварини і де вони живуть", "🌦️ Погода і пори року", "🙂 Я і моє тіло", "🧩 Логіка", "✏️ Лабіринти й обведення", "🚒 Професії і транспорт", "🕒 Годинник і тиждень", "⭐ Мої досягнення"]
          .map(t => `<div style="background:#fff;border-radius:4mm;padding:3mm 4mm">${t}</div>`).join("")}
      </div>
      <div style="font-size:4.4mm;line-height:1.5;color:${C.ink2}">Сторінки ламіновані: малюйте маркером «пиши-стирай» і перечіплюйте деталі скільки завгодно разів.</div>
      <div style="margin-top:auto;font-size:3.6mm;line-height:1.5;color:${C.ink2};border-top:.3mm solid ${C.line};padding-top:4mm">
        <b>Увага!</b> Містить дрібні деталі. Не призначено для дітей до 3 років без нагляду дорослих.<br>
        Виробник: ФОП Костенко Ольга Володимирівна, Україна. Instagram / Telegram: ______<br>
        ${L.CREDIT}
      </div>
    </div>`);
  await L.render("papka_3_oblozhka", L.doc("Папка — обкладинка", [front, back]));

  // 4. Вкладиш A5
  const A5 = { w: 154, h: 216 };
  const ins = `<section class="page" style="background:#fff7ec"><div style="position:absolute;left:13mm;top:13mm;right:13mm;bottom:13mm;display:flex;flex-direction:column;gap:4mm;font-size:4.2mm;line-height:1.45">
    <div style="display:flex;align-items:center;gap:3mm">${emoji("🦉", 16)}<h2 style="font-size:7mm">Як гратися з папкою</h2></div>
    <div>1. Деталі лежать у кишені папки. На звороті кожної деталі — липучка, а в куточку — номер сторінки (с.5), щоб легко знайти її місце.</div>
    <div>2. Беріть 1–2 сторінки за раз, 10–15 хвилин. Краще щодня потроху, ніж усе одразу.</div>
    <div>3. Хваліть за спробу, а не лише за правильну відповідь. Помилився — просто перечепіть деталь.</div>
    <div>4. Сторінки з ✏️ — для маркера «пиши-стирай». Стирається серветкою.</div>
    <div>5. За кожен розділ — зірочка на останній сторінці «Мої досягнення».</div>
    <div style="margin-top:auto;background:#fff;border-radius:4mm;padding:4mm;text-align:center;font-weight:800">Поділіться фото в Instagram і позначте нас — даруємо <b style="color:#ff7a59">−10%</b> на наступний набір!</div>
  </div></section>`;
  await L.render("papka_4_vkladysh", L.doc("Папка — вкладиш", [ins], { size: A5 }), { size: A5 });
  console.log(`Папка: ${PAGES.length} сторінок, ${PIECES.length} деталей, ${sheets.length} аркушів деталей`);
}

module.exports = { build };
if (require.main === module) build().then(L.done).catch(e => { console.error(e); process.exit(1); });
