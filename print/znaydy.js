/* =========================================================
   «Знайди і покажи з Тямком» — книга 28 сторінок A4, макет для друку
   12 сюжетів на розворотах: на кожному сховався Тямко 🦉, 15 предметів для пошуку і бонус «порахуй».
   Предмети не ставляться в зону корінця (±8 мм від центру розвороту).
   Вихід: print/out/znaydy.pdf (сторінки по одній, з вильотами; порядок — як у книзі)
   ========================================================= */
"use strict";
const L = require("./lib");
L.ensureAssets();
const { emojiAt, emoji, header, footer, page, esc, rng, PAGE, SAFE, BLEED, COLORS: C } = L;

const SW = 2 * PAGE.w - 2 * BLEED, SH = PAGE.h;   // розворот з вильотами: 426 × 303 мм
const BAR = 40;                                     // смуга «Знайди» внизу розвороту

const SCENES = [
  { t: "Ранок удома", sky: "#fde7cf", ground: "#e8c9a0", gy: 150, bonus: ["🧦", "шкарпеток"],
    items: ["🛏️", "🧸", "🪥", "👕", "🥣", "🍳", "☕", "🕰️", "📚", "🪴", "🧺", "🖼️", "🎈", "🪀", "🧩", "🚂", "🦆", "🍌", "🍞", "🥛", "🔑", "👟", "🎒", "🪑", "💡", "📺", "🧼", "🐈"] },
  { t: "Садочок", sky: "#e9f3ff", ground: "#ffe2b8", gy: 160, bonus: ["🖍️", "олівців"],
    items: ["🧸", "🎨", "🧩", "🚗", "🪀", "🎈", "🥁", "🎹", "📚", "✏️", "🍎", "🧃", "🪁", "⚽", "🎲", "🦖", "🧱", "🪇", "🎺", "🚀", "🐞", "🧁", "🎀", "👑", "🦕", "🪆", "🥪"] },
  { t: "Ринок", sky: "#dff1ff", ground: "#f3e2c3", gy: 120, bonus: ["🍎", "яблук"],
    items: ["🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🥕", "🥔", "🧅", "🥒", "🌽", "🍅", "🧀", "🥚", "🍞", "🐟", "🌻", "🛒", "👜", "🍯", "🥦", "🍒", "🫑", "🧄", "🥜", "🌷", "🪣"] },
  { t: "Зоопарк", sky: "#e3f6ff", ground: "#d9f0c2", gy: 130, bonus: ["🦜", "папуг"],
    items: ["🦁", "🐯", "🐘", "🦒", "🦓", "🦛", "🐒", "🐧", "🦩", "🐊", "🐢", "🦘", "🐼", "🐨", "🦔", "🐍", "🦚", "🐫", "🦏", "🌴", "🎈", "🍦", "🍿", "🐠", "🦦", "🦥", "🐆"] },
  { t: "Ліс восени", sky: "#fff1dc", ground: "#f2d29a", gy: 140, bonus: ["🍄", "грибочків"],
    items: ["🦔", "🦊", "🐿️", "🍂", "🍁", "🌰", "🐻", "🦌", "🐇", "🐌", "🐞", "🌲", "🍎", "🪵", "🐗", "🦡", "🕷️", "🐝", "🦋", "🌳", "🍇", "🥾", "🧺", "🦫", "🐸", "🪺", "🐛"] },
  { t: "Карпати взимку", sky: "#e2efff", ground: "#ffffff", gy: 140, bonus: ["⛄", "сніговиків"],
    items: ["⛷️", "🏂", "🛷", "❄️", "🌲", "🏔️", "🦌", "🐑", "🧣", "🧤", "🎿", "🔥", "🏠", "☕", "🐕", "🐿️", "🦊", "🧦", "🍪", "🔔", "⭐", "🪵", "🐦", "🫖", "🎄", "🐇", "🥾"] },
  { t: "Море влітку", sky: "#d8f0ff", ground: "#ffe7a8", gy: 175, sea: true, bonus: ["🐚", "мушель"],
    items: ["⛱️", "🦀", "🐠", "🐬", "🐙", "🦭", "🐳", "⛵", "🚤", "🏄", "🍉", "🍦", "🕶️", "🩴", "🪣", "🌴", "🐢", "🏐", "🛟", "🦩", "🍹", "🎣", "🐡", "👒", "🧴", "🪁", "🏰"] },
  { t: "Вокзал", sky: "#eef0f7", ground: "#d9d4cc", gy: 150, bonus: ["🧳", "валіз"],
    items: ["🚂", "🚃", "🕰️", "☕", "🥐", "🎫", "🚕", "🚌", "🐕", "🌂", "🗺️", "📰", "🎧", "🧸", "💺", "🎒", "🍦", "🚲", "🛴", "📷", "🍩", "🥤", "🐈", "🌻", "🎈", "🧃", "👓"] },
  { t: "Ферма", sky: "#e6f5ff", ground: "#cfeaa8", gy: 130, bonus: ["🐓", "півників"],
    items: ["🐄", "🐖", "🐑", "🐐", "🐎", "🦆", "🐇", "🐕", "🐈", "🚜", "🌾", "🥕", "🌻", "🥚", "🪣", "🐝", "🦃", "🐁", "🌽", "🍅", "🥛", "🧺", "🪿", "🐥", "🍎", "🐀", "🦢"] },
  { t: "Свято Миколая", sky: "#f2ecff", ground: "#ffffff", gy: 160, bonus: ["🎁", "подарунків"],
    items: ["🧦", "🍬", "🍭", "🍪", "🎄", "⭐", "❄️", "🔔", "🕯️", "🧸", "🚂", "🎈", "📚", "🍊", "🍫", "🪀", "🧁", "🎀", "🛷", "🧤", "🧣", "🎺", "🥁", "🪅", "🍩", "⛄", "🦌"] },
  { t: "Підводний світ", sky: "#bfe6ff", ground: "#f7e3b5", gy: 230, deep: true, bonus: ["🐟", "рибок"],
    items: ["🐠", "🐡", "🦈", "🐙", "🦑", "🦀", "🦞", "🐚", "🐢", "🐬", "🐳", "🦭", "🪸", "🪼", "🤿", "⚓", "💎", "🐋", "🦐", "🧜", "🌿", "🪨", "🐌", "🫧", "🦦", "🏴‍☠️", "🔱"] },
  { t: "Космос", sky: "#1f2a5c", ground: "#1f2a5c", gy: 400, space: true, bonus: ["⭐", "зірочок"],
    items: ["🚀", "🛸", "🪐", "🌍", "🌙", "☄️", "🧑‍🚀", "🛰️", "🌞", "🔭", "👽", "👾", "🌟", "💫", "🌕", "🌑", "📡", "🤖", "🎈", "🧃", "🔦", "🧭", "🍕", "🐶", "🪨", "🕹️", "🌈"] }
];

/** Сюжет: розкладка предметів без накладання; повертає SVG розвороту і дані для відповідей */
function compose(sc, idx) {
  const r = rng(1000 + idx * 37);
  const shuffle = a => a.map(v => [r(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
  const types = shuffle(sc.items.filter(c => c !== sc.bonus[0]));
  const find = types.slice(0, 15), fill = types.slice(15);
  const placed = [];
  const top = 10, bottom = SH - BAR - 6, left = 8, right = SW - 8, gutter = [SW / 2 - 9, SW / 2 + 9];
  function put(ch, size, tries = 400) {
    for (let t = 0; t < tries; t++) {
      const x = left + r() * (right - left - size), y = top + r() * (bottom - top - size);
      if (x + size > gutter[0] && x < gutter[1]) continue;
      const cx = x + size / 2, cy = y + size / 2;
      if (placed.some(p => Math.hypot(p.cx - cx, p.cy - cy) < (p.s + size) / 2 * 0.86)) continue;
      const rot = (r() - .5) * 30;
      placed.push({ ch, x, y, s: size, cx, cy, rot });
      return placed[placed.length - 1];
    }
    return null;
  }
  const owl = put("🦉", 10);
  find.forEach(ch => put(ch, 14 + r() * 6));
  const bonusCount = 5 + Math.floor(r() * 5);
  let bc = 0; for (let i = 0; i < bonusCount; i++) if (put(sc.bonus[0], 12 + r() * 6)) bc++;
  for (let i = 0; i < 140 && placed.length < 110; i++) put(fill[i % fill.length], 13 + r() * 9, 60);

  // Фон
  let bg = `<rect x="0" y="0" width="${SW}" height="${SH}" fill="${sc.sky}"/>`;
  if (sc.space) { for (let i = 0; i < 160; i++) bg += `<circle cx="${r() * SW}" cy="${r() * SH}" r="${.3 + r() * .8}" fill="#fff" opacity="${.4 + r() * .6}"/>`; }
  else if (sc.deep) { bg += `<rect x="0" y="0" width="${SW}" height="${SH}" fill="url(#deep${idx})"/><defs><linearGradient id="deep${idx}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe6ff"/><stop offset="1" stop-color="#4f9fd9"/></linearGradient></defs><path d="M0 ${sc.gy} Q ${SW / 4} ${sc.gy - 12} ${SW / 2} ${sc.gy} T ${SW} ${sc.gy} V ${SH} H0Z" fill="${sc.ground}"/>`; }
  else {
    bg += `<path d="M0 ${sc.gy} Q ${SW / 4} ${sc.gy - 16} ${SW / 2} ${sc.gy} T ${SW} ${sc.gy} V ${SH} H0Z" fill="${sc.ground}"/>`;
    if (sc.sea) bg += `<path d="M0 ${sc.gy - 70} Q ${SW / 8} ${sc.gy - 76} ${SW / 4} ${sc.gy - 70} T ${SW / 2} ${sc.gy - 70} T ${3 * SW / 4} ${sc.gy - 70} T ${SW} ${sc.gy - 70} V ${sc.gy + 4} H0Z" fill="#7cc6f2"/>`;
  }
  const objs = placed.map(p => `<g transform="rotate(${p.rot.toFixed(1)} ${p.cx.toFixed(1)} ${p.cy.toFixed(1)})">${emojiAt(p.ch, p.x.toFixed(1), p.y.toFixed(1), p.s.toFixed(1))}</g>`).join("");

  // Смуга «Знайди»
  const by = SH - BAR - BLEED;
  let bar = `<rect x="0" y="${by}" width="${SW}" height="${BAR + BLEED}" fill="#ffffff"/><rect x="0" y="${by}" width="${SW}" height="1.2" fill="${C.coral}"/>`;
  bar += `<text x="${SAFE}" y="${by + 11}" font-family="Nunito" font-weight="900" font-size="6" fill="${C.ink}">Знайди:</text>`;
  bar += `<rect x="${SAFE}" y="${by + 15}" width="36" height="20" rx="4" fill="#fff4dc"/>${emojiAt("🦉", SAFE + 2, by + 17, 16)}<text x="${SAFE + 20}" y="${by + 27}" font-family="Nunito" font-weight="900" font-size="4" fill="${C.ink}">Тямка!</text>`;
  // розкладаємо 15 предметів, оминаючи корінець
  let x = SAFE + 42; find.forEach(ch => { if (x + 18 > gutter[0] - 2 && x < gutter[1] + 2) x = gutter[1] + 4;
    bar += `<rect x="${x}" y="${by + 15}" width="17" height="20" rx="4" fill="#f6f1ff"/>${emojiAt(ch, x + 1.5, by + 16.5, 14)}<rect x="${x + 12}" y="${by + 30}" width="4" height="4" rx="1" fill="#fff" stroke="#c9bfd9" stroke-width=".4"/>`; x += 19; });
  bar += `<rect x="${x + 2}" y="${by + 15}" width="${SW - SAFE - x - 2}" height="20" rx="4" fill="#e6f6e9"/>${emojiAt(sc.bonus[0], x + 4, by + 17, 15)}<text x="${x + 21}" y="${by + 21.5}" font-family="Nunito" font-weight="900" font-size="3.2" fill="${C.ink}">Порахуй</text><text x="${x + 21}" y="${by + 26.5}" font-family="Nunito" font-weight="800" font-size="3.2" fill="${C.ink}">${esc(sc.bonus[1])}:</text><text x="${x + 21}" y="${by + 32.5}" font-family="Nunito" font-weight="900" font-size="3.6" fill="${C.ink}">____</text>`;

  // Назва сюжету
  const title = `<rect x="${SAFE - 2}" y="${BLEED + 6}" width="${sc.t.length * 3.6 + 22}" height="12" rx="6" fill="#ffffff" opacity=".92"/><text x="${SAFE + 3}" y="${BLEED + 14.2}" font-family="Nunito" font-weight="900" font-size="6" fill="${C.coral}">${idx + 1}. ${esc(sc.t)}</text>`;
  const svg = bg + objs + bar + title;
  return { svg, owl, bonus: bc, find };
}

const spreadPage = (svg, right, n, t) =>
  `<section class="page"><svg viewBox="${right ? SW - PAGE.w : 0} 0 ${PAGE.w} ${PAGE.h}" style="position:absolute;inset:0;width:${PAGE.w}mm;height:${PAGE.h}mm">${svg}</svg>
   <div style="position:absolute;${right ? `right:${BLEED + 6}mm` : `left:${BLEED + 6}mm`};bottom:${BLEED + 2}mm;font-size:2.6mm;color:#9a92ad">${n}</div></section>`;

async function build() {
  const pages = [];
  pages.push(page(`<div style="position:absolute;inset:0;background:linear-gradient(160deg,#9cc7ff,#6a8cff)"></div>
    <div class="safe" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;gap:6mm">
      <div style="font-size:8mm;font-weight:900;letter-spacing:.5mm">ТЯМКО</div>
      <div style="position:relative">${emoji("🔍", 70)}<div style="position:absolute;left:9mm;top:9mm">${emoji("🦉", 34)}</div></div>
      <h1 style="font-size:18mm">Знайди<br>і покажи</h1>
      <div style="font-size:6mm;font-weight:800;background:#fff;color:#6a8cff;border-radius:20mm;padding:2mm 8mm">12 великих картин · 3–7 років</div>
      <div style="display:flex;gap:3mm">${["🏠", "🦁", "🏔️", "🐬", "🚂", "🚀"].map(c => emoji(c, 14)).join("")}</div>
    </div>`));
  pages.push(page(`${header("Привіт! Я — Тямко", "Я сховався на кожній картині. Знайдеш?", C.sky, null)}
    <div class="safe" style="top:40mm;display:flex;flex-direction:column;gap:6mm;font-size:6mm;font-weight:800;line-height:1.4">
      <div style="display:flex;justify-content:center">${emoji("🦉", 60)}</div>
      <div>🔍 На кожному розвороті знайди <b>мене</b> — маленького Тямка.</div>
      <div>✅ Знайди <b>15 предметів</b> зі смужки внизу. Знайшов — постав галочку олівцем.</div>
      <div>🔢 Виконай бонус: <b>порахуй</b> предмети, які намальовані багато разів.</div>
      <div>👀 Відповіді — наприкінці книги. Але не підглядай!</div>
      <div style="margin-top:auto;font-size:3.6mm;color:${C.ink2};font-weight:600">Для дорослих: запитуйте «Що це? Якого кольору? Що з цим роблять?» — так книга розвиває ще й мовлення.<br>Виробник: ФОП Костенко Ольга Володимирівна, Україна. ${L.CREDIT}</div>
    </div>`, { bg: "#fffdf9" }));
  const answers = [];
  SCENES.forEach((sc, i) => {
    const s = compose(sc, i);
    answers.push({ sc, s, i });
    pages.push(spreadPage(s.svg, false, 3 + i * 2, sc.t), spreadPage(s.svg, true, 4 + i * 2, sc.t));
  });
  // Відповіді
  let ans = header("Відповіді", "Тямко обведений червоним колом", C.sky, 27);
  ans += `<div class="safe" style="top:34mm;display:grid;grid-template-columns:1fr 1fr 1fr;gap:3mm">` + answers.map(({ sc, s, i }) =>
    `<div><svg viewBox="0 0 ${SW} ${SH}" style="width:100%;border-radius:2mm;display:block">${s.svg}<circle cx="${s.owl.cx}" cy="${s.owl.cy}" r="12" fill="none" stroke="#e5383b" stroke-width="3"/></svg>
     <div style="font-size:3.2mm;font-weight:800;margin-top:1mm">${i + 1}. ${esc(sc.t)} · ${esc(sc.bonus[1])}: <b style="color:#e5383b">${s.bonus}</b></div></div>`).join("") + `</div>`;
  pages.push(page(ans, { bg: "#fffdf9" }));
  pages.push(page(`<div style="position:absolute;inset:0;background:#fff4dc"></div>
    <div class="safe" style="border:2mm solid #ffc93c;border-radius:8mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6mm">
      ${emoji("🏅", 50)}<h1 style="font-size:16mm;color:#ff7a59">Диплом<br>Супер-шукача</h1>
      <div style="font-size:6mm;font-weight:800">вручається</div>
      <div style="width:140mm;border-bottom:.5mm solid ${C.ink};height:12mm"></div>
      <div style="font-size:5mm;font-weight:800">за те, що знайшов(-ла) Тямка на всіх 12 картинах!</div>
      ${emoji("🦉", 30)}
    </div>`));
  await L.render("znaydy", L.doc("Знайди і покажи", pages));
  console.log("Знайди і покажи: " + pages.length + " сторінок");
}
module.exports = { build };
if (require.main === module) build().then(L.done).catch(e => { console.error(e); process.exit(1); });
