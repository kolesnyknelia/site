/* =========================================================
   «Мій день і мої емоції» — магнітні картки, макети для друку
   Вихід (print/out/):
     den_1_kartky.pdf            картки режиму дня, емоцій і «Що допоможе» (магнітний вініл, висічка)
     den_1_kartky_VYSICHKA.pdf   контури висічки
     den_2_doshka.pdf            дошка A4, 2 сторони: «Мій день» і «Як я себе почуваю?»
     den_3_buklet.pdf            буклет для батьків A5, 8 сторінок
   ========================================================= */
"use strict";
const L = require("./lib");
L.ensureAssets();
const { emoji, header, footer, page, esc, SAFE, PAGE, BLEED, COLORS: C } = L;

const A = (x, y, w, h, inner = "", style = "") =>
  `<div style="position:absolute;left:${x}mm;top:${y}mm;width:${w}mm;height:${h}mm;${style}">${inner}</div>`;

const PARTS = {
  ranok: { name: "Ранок", icon: "🌅", color: "#ffb020", bg: "#fff4dc" },
  den: { name: "День", icon: "☀️", color: "#4fc29f", bg: "#e6f6e9" },
  vechir: { name: "Вечір", icon: "🌙", color: "#7b6cff", bg: "#eeeaff" }
};

const ROUTINE = [
  ["ranok", "⏰", "Прокинутись"], ["ranok", "🚽", "Туалет"], ["ranok", "🧼", "Вмитися"], ["ranok", "🪥", "Почистити зуби"],
  ["ranok", "💇", "Причесатися"], ["ranok", "👕", "Вдягнутися"], ["ranok", "🥣", "Сніданок"], ["ranok", "👟", "Взутися"],
  ["ranok", "🤸", "Зарядка"], ["ranok", "🏫", "Садочок"],
  ["den", "🍲", "Обід"], ["den", "😴", "Денний сон"], ["den", "🌳", "Прогулянка"], ["den", "🧸", "Гра"],
  ["den", "🎨", "Малювання"], ["den", "📚", "Читання"], ["den", "✏️", "Заняття"], ["den", "⚽", "Гурток"],
  ["den", "🎵", "Музика"], ["den", "🙌", "Помити руки"], ["den", "🍎", "Перекус"], ["den", "💧", "Випити води"],
  ["den", "🧺", "Прибрати іграшки"], ["den", "🧹", "Допомогти"], ["den", "🛒", "Магазин"], ["den", "🩺", "Лікар"],
  ["den", "👨‍👩‍👧", "Гості"], ["den", "🚗", "Поїздка"], ["den", "🎉", "Свято"], ["den", "🏊", "Басейн"],
  ["vechir", "🍽️", "Вечеря"], ["vechir", "📺", "Мультик"], ["vechir", "🛁", "Купання"], ["vechir", "🪥", "Почистити зуби"],
  ["vechir", "👚", "Піжама"], ["vechir", "📖", "Казка"], ["vechir", "🤗", "Обійми"], ["vechir", "👖", "Скласти одяг"],
  ["vechir", "🧸", "Іграшки спати"], ["vechir", "🛏️", "Сон"]
];
const EMOTIONS = [["😄", "Радість", "#ffc93c"], ["😢", "Сум", "#5b9dff"], ["😠", "Злість", "#e5383b"], ["😨", "Страх", "#9b7bff"],
  ["😲", "Здивування", "#ff8c1a"], ["🥺", "Образа", "#7aa6c2"], ["😳", "Сором", "#ff8fb1"], ["🥱", "Втома", "#a59a8a"],
  ["😌", "Спокій", "#4fc29f"], ["😎", "Гордість", "#ffb020"], ["😑", "Нудьга", "#9a92ad"], ["🥰", "Любов", "#ff6f91"]];
const HELP = [["🤗", "Обійми"], ["🐉", "Подихати, як дракон"], ["🥛", "Випити води"], ["🤫", "Посидіти в тиші"],
  ["🖍️", "Намалювати почуття"], ["🗣️", "Розповісти мамі"], ["🔟", "Порахувати до 10"], ["🧸", "Обійняти іграшку"]];

/* ---------- Картки ---------- */
function card(size, top, label, bg, border) {
  return `<div style="width:100%;height:100%;border-radius:${size / 10}mm;background:${bg};border:.8mm solid ${border};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${size / 25}mm;padding:${size / 14}mm">
    ${top}<div style="font-size:${size / 12.5}mm;font-weight:900;text-align:center;line-height:1.05">${esc(label)}</div></div>`;
}
const routineCards = ROUTINE.map(([p, ch, t]) => card(50, emoji(ch, 26), t, "#fff", PARTS[p].color));
const blankCards = Array.from({ length: 4 }, () => card(50, `<div style="width:26mm;height:26mm;border-radius:4mm;border:.5mm dashed #c9bfd9"></div>`, "_______", "#fff", "#c9bfd9"));
const helpCards = HELP.map(([ch, t]) => card(50, emoji(ch, 24), t, "#f2fbf7", "#4fc29f"));
const arrowCard = `<div style="width:100%;height:100%;display:grid;place-items:center"><svg viewBox="0 0 50 50" style="width:46mm;height:46mm"><path d="M4 25 L32 8 L32 18 L46 18 L46 32 L32 32 L32 42 Z" fill="#ff7a59" stroke="#fff" stroke-width="1.5"/></svg></div>`;
const emotionCards = EMOTIONS.map(([ch, t, c]) => card(60, emoji(ch, 34), t, "#fff", c));

function sheetGrid(items, size, cols, rows, gap, label, shapePath) {
  const W = cols * size + (cols - 1) * gap, H = rows * size + (rows - 1) * gap;
  const ox = (PAGE.w - W) / 2, oy = (PAGE.h - H) / 2 - 2;
  const pages = [];
  for (let s = 0; s * cols * rows < items.length; s++) {
    let inner = "", cut = [];
    items.slice(s * cols * rows, (s + 1) * cols * rows).forEach((it, i) => {
      const x = ox + (i % cols) * (size + gap), y = oy + Math.floor(i / cols) * (size + gap);
      inner += A(x, y, size, size, it.html);
      cut.push(it.cut ? it.cut(x, y) : `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size / 10}"/>`);
    });
    pages.push(page(inner + footer(`${label} · аркуш ${s + 1}`, `${size}×${size} мм · висічка за окремим файлом`), { bg: "#fff", cut }));
  }
  return pages;
}

/* ---------- Дошка ---------- */
function spot(x, y, s, text = "") {
  return A(x, y, s, s, text ? `<div style="font-size:3.6mm;color:#b3a9c6;font-weight:800;text-align:center">${esc(text)}</div>` : "",
    `border:.7mm dashed #c9bfd9;border-radius:${s / 10}mm;background:rgba(255,255,255,.75);display:grid;place-items:center`);
}
function boardDay() {
  let body = header("Мій день", "Постав картки по порядку. Зробив — пересунь у «Зроблено ✓»", "#ff7a59", null, "🦉");
  const y0 = 34, rowH = 59;
  Object.values(PARTS).forEach((p, i) => {
    const y = y0 + i * (rowH + 4);
    body += A(SAFE, y, PAGE.w - 2 * SAFE, rowH, "", `border-radius:6mm;background:${p.bg}`);
    body += A(SAFE + 2, y + 4, 30, rowH - 8, emoji(p.icon, 18) + `<div style="font-size:5.4mm;font-weight:900;color:${p.color}">${p.name}</div>`, "display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm");
    for (let k = 0; k < 3; k++) body += spot(SAFE + 36 + k * 52.5, y + 4.5, 50, k === 0 ? "картка" : "");
  });
  const yd = y0 + 3 * (rowH + 4);
  body += A(SAFE, yd, PAGE.w - 2 * SAFE, rowH, "", "border-radius:6mm;background:#f2fbf7;border:.8mm solid #4fc29f");
  body += A(SAFE + 2, yd + 4, 30, rowH - 8, `<div style="font-size:12mm;color:#4fc29f;font-weight:900">✓</div><div style="font-size:5mm;font-weight:900;color:#2f9b7b">Зроблено</div>`, "display:flex;flex-direction:column;align-items:center;justify-content:center");
  for (let k = 0; k < 3; k++) body += spot(SAFE + 36 + k * 52.5, yd + 4.5, 50);
  return page(body + footer("Магнітна дошка · сторона 1", "Тямко"), { bg: "#fffdf9" });
}
function boardFeel() {
  let body = header("Як я себе почуваю?", "Постав стрілку і картку емоції. Обери, що тобі допоможе", "#9b7bff", null, "🦉");
  const levels = [["🤩", "Супер!", "#4fc29f"], ["🙂", "Добре", "#9bd56a"], ["😐", "Так собі", "#ffc93c"], ["🙁", "Погано", "#ff9a4d"], ["😭", "Дуже погано", "#e5383b"]];
  levels.forEach((l, i) => {
    const y = 36 + i * 30;
    body += A(SAFE, y, 76, 28, emoji(l[0], 18) + `<div style="font-size:5mm;font-weight:900;color:#fff">${l[1]}</div>`,
      `border-radius:${i === 0 ? "8mm 8mm 2mm 2mm" : i === 4 ? "2mm 2mm 8mm 8mm" : "2mm"};background:${l[2]};display:flex;align-items:center;gap:3mm;padding-left:4mm`);
  });
  body += A(SAFE + 80, 36, 40, 150, `<div style="font-size:4mm;font-weight:800;color:#9a92ad;writing-mode:vertical-rl;transform:rotate(180deg)">← постав сюди стрілку</div>`, "display:flex;align-items:center;justify-content:center;border:.7mm dashed #c9bfd9;border-radius:6mm");
  body += A(SAFE + 126, 36, 64, 10, "Зараз я відчуваю:", "font-size:4.6mm;font-weight:900");
  body += spot(SAFE + 128, 48, 60, "картка емоції");
  body += A(SAFE + 126, 116, 64, 10, "Мені допоможе:", "font-size:4.6mm;font-weight:900");
  body += spot(SAFE + 126, 128, 50, "картка") + spot(SAFE + 126, 180, 50, "картка");
  body += A(SAFE, 236, 120, 50, `<div style="font-size:4.4mm;line-height:1.45;font-weight:700;color:${C.ink2}"><b>Для дорослих:</b> назвіть почуття дитини вголос («Ти злишся, бо…»), обійміть і разом оберіть картку «Що допоможе». Усі емоції нормальні — важливо вміти їх прожити.</div>`, "display:flex;align-items:center");
  body += A(SAFE + 126, 236, 64, 50, emoji("🦉", 34), "display:grid;place-items:center");
  return page(body + footer("Магнітна дошка · сторона 2", "Тямко"), { bg: "#fffdf9" });
}

/* ---------- Буклет A5 ---------- */
const A5 = { w: 154, h: 216 };
function bp(inner, bg = "#fff") {
  return `<section class="page" style="background:${bg}"><div style="position:absolute;left:13mm;top:13mm;right:13mm;bottom:13mm;display:flex;flex-direction:column;gap:4.5mm;font-size:4.7mm;line-height:1.5">${inner}</div></section>`;
}
const h = t => `<h2 style="font-size:6.6mm;color:#ff7a59">${esc(t)}</h2>`;
const li = items => items.map(t => `<div style="display:flex;gap:2mm"><span style="color:#ff7a59;font-weight:900">•</span><span>${t}</span></div>`).join("");
const booklet = [
  bp(`<div style="margin:auto;text-align:center;display:flex;flex-direction:column;align-items:center;gap:4mm">${emoji("🦉", 50)}<h1 style="font-size:9mm">Мій день<br>і мої емоції</h1><div style="font-weight:800;color:${C.ink2}">Посібник для батьків</div></div>`, "#fff7ec"),
  bp(`${h("Навіщо дитині розклад")}<div>Малюкам важко тримати в голові, що буде далі. Через це виникають суперечки: «не хочу вдягатися», «не піду купатися». Картинки роблять день передбачуваним, а дитина відчуває, що сама керує своїми справами.</div>
     ${li(["менше суперечок і сліз уранці та ввечері", "дитина вчиться самостійності й послідовності", "легше переживати зміни: поїздку, лікаря, гостей"])}`),
  bp(`${h("Як вводити розклад")}${li(["Почніть з 3–4 карток на ранок. Додавайте нові поступово.", "Складайте розклад разом із дитиною напередодні ввечері.", "Виконану справу дитина сама пересуває в «Зроблено ✓» — це головна радість.", "Порожні картки — для ваших особливих справ: впишіть маркером.", "Будьте послідовні: 1–2 тижні — і розклад стане звичкою."])}`),
  bp(`${h("Як говорити про емоції")}<div>Дитина ще не вміє назвати, що з нею відбувається, тому почуття виходять сльозами чи криком. Картки допомагають побачити й назвати емоцію.</div>
     ${li(["Називайте почуття: «Здається, ти злишся, бо вежа впала».", "Не забороняйте емоції: «Сумувати — нормально».", "Показуйте свої: «Я втомилася, мені потрібно відпочити».", "Питайте вранці та ввечері: «Як ти зараз?» — і ставте стрілку на термометрі."])}`),
  bp(`${h("Коли емоцій забагато")}<div>Спершу заспокойтеся самі — дитина «зчитує» ваш стан. Потім запропонуйте 2 картки «Що мені допоможе» на вибір.</div>
     ${li(["🐉 <b>Подих дракона:</b> глибокий вдих носом, довгий видих ротом, 5 разів.", "🔟 <b>Рахуємо до 10</b> разом, повільно.", "🖍️ <b>Намалюй злість:</b> на папері, а потім зімни або порви аркуш.", "🤗 <b>Обійми</b> — найпростіший і найсильніший спосіб."])}`),
  bp(`${h("5 ігор з картками")}${li(["<b>Що спершу?</b> Перемішайте 4 картки, дитина складає по порядку.", "<b>Покажи емоцію.</b> Тягніть картку — покажіть обличчям, інші вгадують.", "<b>Коли таке буває?</b> «Коли тобі буває радісно?»", "<b>Чого не вистачає?</b> Заберіть одну картку з розкладу — що зникло?", "<b>Казка про Тямка.</b> Складіть історію з 5 карток режиму."])}`),
  bp(`${h("Що в наборі")}${li(["Магнітна дошка: «Мій день» і «Як я себе почуваю?»", "40 карток режиму дня + 4 порожні", "12 карток емоцій", "8 карток «Що мені допоможе»", "Магнітна стрілка для термометра настрою"])}
     <div style="margin-top:auto;font-size:3.2mm;color:${C.muted}">Не призначено для дітей до 3 років без нагляду дорослих: дрібні деталі, магніти.</div>`),
  bp(`<div style="margin:auto;text-align:center;display:flex;flex-direction:column;align-items:center;gap:4mm">${emoji("🦉", 30)}<div style="font-weight:900;font-size:5mm">Тямко · розвивальні набори</div><div>Поділіться фото з набором і позначте нас — даруємо <b style="color:#ff7a59">−10%</b> на наступний.</div><div style="font-size:3mm;color:${C.muted}">ФОП Костенко Ольга Володимирівна, Україна<br>${L.CREDIT}</div></div>`, "#fff7ec")
];

async function build() {
  const small = [...routineCards, ...blankCards, ...helpCards].map(html => ({ html }));
  small.push({ html: arrowCard });
  const cards = [
    ...sheetGrid(small, 50, 3, 5, 4, "Картки режиму дня і «Що допоможе»"),
    ...sheetGrid(emotionCards.map(html => ({ html })), 60, 3, 4, 5, "Картки емоцій")
  ];
  await L.render("den_1_kartky", L.doc("Мій день — картки", cards), { withCut: true });
  await L.render("den_2_doshka", L.doc("Мій день — дошка", [boardDay(), boardFeel()]));
  await L.render("den_3_buklet", L.doc("Мій день — буклет", booklet, { size: A5 }), { size: A5 });
  console.log(`Картки: ${small.length} малих (50 мм) + ${emotionCards.length} емоцій (60 мм)`);
}
module.exports = { build };
if (require.main === module) build().then(L.done).catch(e => { console.error(e); process.exit(1); });
