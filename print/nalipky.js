/* =========================================================
   «Розмальовки наліпками за номерами» — 3 книги, макети для друку
   Кожна картина розбивається на фрагменти (шари ілюстрації):
   - сторінка картини: контури з номерами (дрібні деталі вже надруковані кольором)
   - аркуш наліпок: кольорові фрагменти в тому самому масштабі, з номером; контури висічки — окремим файлом
   Номери йдуть знизу вгору: клеїмо по порядку, верхні наліпки лягають на нижні.
   Вихід (print/out/) для кожної книги <tema>:
     nalipky_<tema>_1_kartyny.pdf          обкладинка + 8 картин + зворот (папір 120–160 г/м²)
     nalipky_<tema>_2_naklejky.pdf         8 аркушів наліпок (самоклейний папір)
     nalipky_<tema>_2_naklejky_VYSICHKA.pdf контури надсічки (kiss-cut)
   ========================================================= */
"use strict";
const L = require("./lib");
L.ensureAssets();
const { emoji, emojiInner, esc, PAGE, SAFE, BLEED, COLORS: C } = L;

/* Сцени в координатах 100×100. bg — фон (друкується світлим, не наліпка) */
const SKY = c => `<rect x="0" y="0" width="100" height="100" rx="6" fill="${c}"/>`;
const GROUND = (c, y = 72) => `<path d="M0 ${y} Q 50 ${y - 8} 100 ${y} L100 100 L0 100Z" fill="${c}"/>`;
const SUN = `<circle cx="84" cy="16" r="9" fill="#fff1b8"/>`;
const it = (ch, x, y, s) => ({ ch, x, y, s });

const BOOKS = [
  { id: "tvaryny", title: "Тварини України", color: "#4fc29f", cover: "🦔", scenes: [
    { t: "Лебідь", bg: SKY("#e3f3ff") + SUN + `<rect x="0" y="62" width="100" height="38" fill="#cfe9fb"/>`, items: [it("🦢", 12, 14, 76)] },
    { t: "Їжачок", bg: SKY("#fff6e3") + GROUND("#e3f2d4"), items: [it("🍂", 72, 50, 20), it("🍄", 6, 46, 26), it("🦔", 20, 22, 64)] },
    { t: "Лисичка", bg: SKY("#fff1e6") + GROUND("#e6f2da", 80), items: [it("🦊", 10, 8, 80)] },
    { t: "Ведмедик", bg: SKY("#f2ecff") + GROUND("#e6f2da", 82), items: [it("🍯", 66, 60, 26), it("🐻", 6, 6, 72)] },
    { t: "Зубр", bg: SKY("#eef6ff") + SUN + GROUND("#e3f2d4", 70), items: [it("🦬", 8, 14, 82)] },
    { t: "Сова", bg: SKY("#ece9ff") + `<circle cx="80" cy="18" r="10" fill="#fff6c9"/>`, items: [it("🌙", 70, 6, 22), it("🦉", 14, 16, 72)] },
    { t: "Білочка", bg: SKY("#fff4e0") + GROUND("#e6f2da", 80), items: [it("🌰", 70, 66, 18), it("🌰", 82, 74, 14), it("🐿️", 8, 8, 74)] },
    { t: "Дельфін", bg: SKY("#e3f3ff") + SUN + `<rect x="0" y="66" width="100" height="34" fill="#cde8fb"/>`, items: [it("🌊", 54, 60, 40), it("🐬", 6, 10, 70)] }
  ] },
  { id: "karpaty", title: "Карпати", color: "#5b9dff", cover: "🏔️", scenes: [
    { t: "Говерла", bg: SKY("#e8f3ff") + SUN, items: [it("🏔️", 6, 4, 88)] },
    { t: "Полонина", bg: SKY("#eef7ff") + GROUND("#dcefcf", 66), items: [it("⛰️", 30, 2, 56), it("🐑", 4, 50, 38), it("🐑", 56, 56, 34)] },
    { t: "Хатинка в горах", bg: SKY("#fff6e6") + GROUND("#e1f0d4", 76), items: [it("🌲", 66, 26, 34), it("🏡", 6, 18, 66)] },
    { t: "Олень", bg: SKY("#eef6ff") + GROUND("#e1f0d4", 80), items: [it("🌲", 70, 12, 30), it("🦌", 6, 10, 76)] },
    { t: "Озеро Синевир", bg: SKY("#e8f6ff"), items: [it("🏞️", 4, 4, 92)] },
    { t: "Орел над горами", bg: SKY("#eaf4ff"), items: [it("⛰️", 30, 46, 64), it("🦅", 4, 4, 64)] },
    { t: "Смерекові ліси", bg: SKY("#f2f9ff") + GROUND("#e1f0d4", 82), items: [it("🌲", 0, 20, 46), it("⛺", 54, 50, 40), it("🌲", 52, 6, 40)] },
    { t: "Корівка на полонині", bg: SKY("#f5fbff") + GROUND("#dcefcf", 62), items: [it("🌼", 72, 72, 18), it("🐄", 6, 18, 76)] }
  ] },
  { id: "svyata", title: "Наші свята", color: "#ff7a59", cover: "🎄", scenes: [
    { t: "Ялинка", bg: SKY("#eef4ff") + GROUND("#ffffff", 84), items: [it("🎁", 66, 68, 26), it("🎄", 6, 4, 74)] },
    { t: "Подарунки від Миколая", bg: SKY("#fff0f0"), items: [it("⭐", 72, 4, 22), it("🧦", 60, 26, 34), it("🎁", 6, 30, 60)] },
    { t: "Різдвяна зірка", bg: SKY("#1f2a5c"), items: [it("🕯️", 70, 56, 28), it("🔔", 4, 58, 30), it("⭐", 18, 6, 64)] },
    { t: "Сніговик", bg: SKY("#eaf3ff") + GROUND("#ffffff", 80), items: [it("❄️", 74, 8, 18), it("☃️", 8, 6, 78)] },
    { t: "Великдень", bg: SKY("#f5ffe9"), items: [it("🌷", 72, 40, 26), it("🧺", 8, 44, 52), it("🐣", 38, 6, 40)] },
    { t: "День народження", bg: SKY("#fff4fb"), items: [it("🎈", 70, 4, 28), it("🎂", 6, 22, 70)] },
    { t: "День Незалежності", bg: SKY("#fffbe6"), items: [it("🇺🇦", 46, 6, 48), it("🌻", 4, 30, 62)] },
    { t: "Івана Купала", bg: SKY("#20305e") + `<circle cx="18" cy="16" r="8" fill="#fff6c9"/>`, items: [it("🌸", 70, 8, 22), it("🌼", 6, 64, 22), it("🔥", 24, 22, 58)] }
  ] }
];

function sceneSvg(sc) {
  return sc.bg.replace(/<(rect|path|circle)/g, '<$1 data-bg="1"') +
    sc.items.map(i => `<svg x="${i.x}" y="${i.y}" width="${i.s}" height="${i.s}" viewBox="0 0 36 36">${emojiInner(i.ch)}</svg>`).join("");
}

/* ---------- Код, що виконується в браузері ---------- */
const BROWSER = String.raw`
(async () => {
const PX = 8;                       // пікселів на одиницю сцени при аналізі (100 од. → 800 px)
const N = 100 * PX;
const SHEET = { x: 13, y: 22, w: 190, h: 262 };   // зона розкладки наліпок на аркуші, мм
const MIN_SIDE = 6, MIN_INSCRIBED = 2.2;           // мінімальна наліпка, мм
const ns = "http://www.w3.org/2000/svg";
const leafSel = "path,circle,ellipse,rect,polygon";

function leavesOf(svg) { return [...svg.querySelectorAll(leafSel)].filter(e => !e.closest("defs,clipPath,mask") && !e.hasAttribute("data-bg")); }
function loadImg(svgEl) {
  return new Promise((res, rej) => {
    const s = new XMLSerializer().serializeToString(svgEl);
    const img = new Image(); img.onload = () => res(img); img.onerror = rej;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
  });
}
async function raster(svgEl) {
  const img = await loadImg(svgEl);
  const c = document.createElement("canvas"); c.width = c.height = N;
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, N, N);
  return g.getImageData(0, 0, N, N).data;
}
/* Відстань до межі області (шаховий метрик, 2 проходи) */
function distField(lab) {
  const d = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) d[i] = lab[i] > 0 ? 1e9 : 0;
  const at = (x, y) => (x < 0 || y < 0 || x >= N || y >= N) ? 0 : d[y * N + x];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (!d[i]) continue;
    const l = lab[i]; let m = d[i];
    [[-1, 0, 1], [0, -1, 1], [-1, -1, 1.414], [1, -1, 1.414]].forEach(([dx, dy, w]) => { const xx = x + dx, yy = y + dy;
      const v = (xx < 0 || yy < 0 || xx >= N) ? 0 : (lab[yy * N + xx] === l ? d[yy * N + xx] : 0); m = Math.min(m, v + w); }); d[i] = m; }
  for (let y = N - 1; y >= 0; y--) for (let x = N - 1; x >= 0; x--) { const i = y * N + x; if (!d[i]) continue;
    const l = lab[i]; let m = d[i];
    [[1, 0, 1], [0, 1, 1], [1, 1, 1.414], [-1, 1, 1.414]].forEach(([dx, dy, w]) => { const xx = x + dx, yy = y + dy;
      const v = (xx < 0 || xx >= N || yy >= N) ? 0 : (lab[yy * N + xx] === l ? d[yy * N + xx] : 0); m = Math.min(m, v + w); }); d[i] = m; }
  return d;
}
function analyse(lab, count) {
  const d = distField(lab);
  const r = Array.from({ length: count + 1 }, () => ({ n: 0, best: 0, bx: 0, by: 0, x0: N, y0: N, x1: 0, y1: 0 }));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x, l = lab[i]; if (!l) continue;
    const o = r[l]; o.n++; if (d[i] > o.best) { o.best = d[i]; o.bx = x; o.by = y; }
    if (x < o.x0) o.x0 = x; if (y < o.y0) o.y0 = y; if (x > o.x1) o.x1 = x; if (y > o.y1) o.y1 = y; }
  return r;
}
function lum(fill) { const m = fill.match(/\d+/g); if (!m) return 1; const [r, g, b] = m.map(Number); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }

/* Розкладка прямокутників полицями; повертає позиції або null */
function pack(rects, W, H, gap) {
  const order = rects.map((r, i) => i).sort((a, b) => rects[b].h - rects[a].h);
  let x = 0, y = 0, shelf = 0; const pos = [];
  for (const i of order) { const r = rects[i];
    if (r.w > W) return null;
    if (x + r.w > W) { x = 0; y += shelf + gap; shelf = 0; }
    if (y + r.h > H) return null;
    pos[i] = { x, y }; x += r.w + gap; shelf = Math.max(shelf, r.h); }
  return pos;
}

const TARGET = 200, MAXCELLS = 12;        // площа одного шматочка мозаїки, мм²; макс. шматочків з фрагмента
let UID = 0;
const mat = (host, el) => host.getScreenCTM().inverse().multiply(el.getScreenCTM());

/* Комірки Вороного: точки-зерна в масці фрагмента → багатокутники (px) */
function seedsFor(mask, c, rnd) {
  const pts = [];
  for (let y = 0; y < N; y += 3) for (let x = 0; x < N; x += 3) if (mask[y * N + x]) pts.push([x, y]);
  if (c <= 1 || pts.length < c * 4) return null;
  const S = [pts[Math.floor(rnd() * pts.length)]];
  const dmin = pts.map(p => Infinity);
  while (S.length < c) {
    const s = S[S.length - 1]; let bi = 0, bd = -1;
    pts.forEach((p, i) => { const d = (p[0] - s[0]) ** 2 + (p[1] - s[1]) ** 2; if (d < dmin[i]) dmin[i] = d; if (dmin[i] > bd) { bd = dmin[i]; bi = i; } });
    S.push(pts[bi]);
  }
  for (let it = 0; it < 6; it++) {                      // Ллойд: рівномірніші шматочки
    const acc = S.map(() => [0, 0, 0]);
    pts.forEach(p => { let bi = 0, bd = Infinity; S.forEach((s, i) => { const d = (p[0] - s[0]) ** 2 + (p[1] - s[1]) ** 2; if (d < bd) { bd = d; bi = i; } }); acc[bi][0] += p[0]; acc[bi][1] += p[1]; acc[bi][2]++; });
    acc.forEach((a, i) => { if (a[2]) S[i] = [a[0] / a[2], a[1] / a[2]]; });
  }
  return S;
}
function cellPoly(S, i) {
  let poly = [[-5, -5], [N + 5, -5], [N + 5, N + 5], [-5, N + 5]];
  const si = S[i];
  S.forEach((sj, j) => { if (j === i) return;
    const nx = sj[0] - si[0], ny = sj[1] - si[1], mx = (si[0] + sj[0]) / 2, my = (si[1] + sj[1]) / 2;
    const side = p => (p[0] - mx) * nx + (p[1] - my) * ny;            // ≤0 — ближче до si
    const out = [];
    poly.forEach((p, k) => { const q = poly[(k + 1) % poly.length], a = side(p), b = side(q);
      if (a <= 0) out.push(p);
      if ((a <= 0) !== (b <= 0)) { const t = a / (a - b); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); } });
    poly = out; });
  return poly;
}
const nearest = (S, x, y) => { let bi = 0, bd = Infinity; S.forEach((s, i) => { const d = (x - s[0]) ** 2 + (y - s[1]) ** 2; if (d < bd) { bd = d; bi = i; } }); return bi; };

/* Багатокутник (px сцени) → координати батьківського елемента фрагмента */
function localPts(poly, M) {
  const inv = M.inverse();
  return poly.map(([x, y]) => { const p = new DOMPoint(x / PX, y / PX).matrixTransform(inv); return p.x.toFixed(3) + "," + p.y.toFixed(3); }).join(" ");
}
function addClip(parent, id, inner) {
  let defs = parent.querySelector(":scope > defs");
  if (!defs) { defs = document.createElementNS(ns, "defs"); parent.insertBefore(defs, parent.firstChild); }
  defs.insertAdjacentHTML("beforeend", '<clipPath id="' + id + '" clipPathUnits="userSpaceOnUse">' + inner + "</clipPath>");
}
function bare(el) { const c = el.cloneNode(true); c.removeAttribute("id"); c.removeAttribute("clip-path"); return c.outerHTML; }

const pages = [];
for (const book of DATA) {
  const art = [], stick = [];
  for (const [si, sc] of book.scenes.entries()) {
    const rnd = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(si * 7919 + book.id.length);
    const host = document.createElementNS(ns, "svg");
    host.setAttribute("xmlns", ns); host.setAttribute("viewBox", "0 0 100 100");
    host.setAttribute("width", N); host.setAttribute("height", N); host.setAttribute("shape-rendering", "crispEdges");
    host.innerHTML = sc.svg; document.getElementById("work").appendChild(host);
    leavesOf(host).forEach(e => { if (getComputedStyle(e).fill === "none") e.remove(); });
    const leaves = leavesOf(host);
    const fills = leaves.map(e => getComputedStyle(e).fill);
    leaves.forEach((e, k) => { if (!e.getAttribute("fill")) e.setAttribute("fill", fills[k]); });
    const PM = leaves.map(e => mat(host, e.parentNode));          // батьківська система координат → сцена

    // Видимі частини
    const idm = host.cloneNode(true);
    [...idm.querySelectorAll("[data-bg]")].forEach(e => e.remove());
    leavesOf(idm).forEach((e, k) => { const id = k + 1; e.setAttribute("fill", "rgb(" + (id & 255) + "," + ((id >> 8) & 255) + ",7)"); e.setAttribute("stroke", "none"); e.removeAttribute("opacity"); });
    const px = await raster(idm);
    const lab = new Int32Array(N * N);
    for (let i = 0; i < N * N; i++) { if (px[i * 4 + 3] < 255 || px[i * 4 + 2] !== 7) continue; lab[i] = px[i * 4] + (px[i * 4 + 1] << 8); }

    // Повні маски фрагментів
    const masks = [];
    for (let k = 0; k < leaves.length; k++) {
      const one = host.cloneNode(true);
      [...one.querySelectorAll("[data-bg]")].forEach(e => e.remove());
      leavesOf(one).forEach((e, j) => { if (j !== k) e.remove(); else { e.setAttribute("fill", "rgb(1,0,7)"); e.setAttribute("stroke", "none"); } });
      const p2 = await raster(one); const m = new Uint8Array(N * N);
      for (let i = 0; i < N * N; i++) if (p2[i * 4 + 3] === 255 && p2[i * 4 + 2] === 7) m[i] = 1;
      masks.push(m);
    }

    // Шматочки при заданому масштабі
    function piecesAt(S) {
      const mm = S / N, out = [];
      leaves.forEach((e, k) => {
        const m = masks[k]; let area = 0; for (let i = 0; i < N * N; i++) area += m[i];
        if (!area) return;
        const c = Math.min(MAXCELLS, Math.max(1, Math.round(area * mm * mm / TARGET)));
        const seeds = seedsFor(m, c, rnd);
        const n = seeds ? seeds.length : 1;
        const full = new Int32Array(N * N), vis = new Int32Array(N * N);
        for (let i = 0; i < N * N; i++) { if (!m[i]) continue; const id = seeds ? nearest(seeds, i % N, (i / N) | 0) + 1 : 1; full[i] = id; if (lab[i] === k + 1) vis[i] = id; }
        const F = analyse(full, n), V = analyse(vis, n);
        for (let p = 1; p <= n; p++) {
          const f = F[p], v = V[p]; if (!f.n || !v.n) continue;
          const w = (f.x1 - f.x0 + 1) * mm, h = (f.y1 - f.y0 + 1) * mm;
          const kind = (Math.min(w, h) < MIN_SIDE || v.best * mm < MIN_INSCRIBED || f.best * mm < MIN_INSCRIBED) ? "print" : "sticker";
          out.push({ k, p, f, v, kind, poly: seeds ? cellPoly(seeds, p - 1) : null, w: w + 1.2, h: h + 1.2 });
        }
      });
      return out;
    }

    let S = 172, chosen;
    for (; S >= 100; S -= 6) {
      const pcs = piecesAt(S), st = pcs.filter(q => q.kind === "sticker");
      const pos = pack(st, SHEET.w, SHEET.h, 2.5);
      if (pos) { chosen = { pcs, st, pos, mm: S / N }; break; }
    }
    if (!chosen) throw new Error("Не вмістилось: " + sc.t);
    const { pcs, st, pos, mm } = chosen;
    st.forEach((q, i) => { q.num = i + 1; });
    const tag = book.id + si;

    // Сторінка картини
    const pic = host.cloneNode(true);
    pic.removeAttribute("width"); pic.removeAttribute("height"); pic.removeAttribute("shape-rendering");
    pic.setAttribute("style", "width:" + S + "mm;height:" + S + "mm;overflow:visible");
    const pl = leavesOf(pic);
    const line = 'stroke="#77708a" stroke-width="1.1" vector-effect="non-scaling-stroke" stroke-linejoin="round"';
    leaves.forEach((e, k) => {
      const mine = pcs.filter(q => q.k === k), el = pl[k], par = el.parentNode;
      if (!mine.length) return;
      if (mine.every(q => q.kind === "print")) { el.setAttribute("stroke", "#77708a"); el.setAttribute("stroke-width", ".6"); el.setAttribute("vector-effect", "non-scaling-stroke"); return; }
      const orig = bare(el);
      el.setAttribute("fill", "#ffffff");
      [...line.matchAll(/(\S+)="([^"]+)"/g)].forEach(([, a, b]) => el.setAttribute(a, b));
      const cid = "s" + tag + "k" + k + "_" + (UID++);
      addClip(par, cid, orig);
      let extra = "";
      mine.forEach(q => {
        if (!q.poly) return;
        const pts = localPts(q.poly, PM[k]);
        if (q.kind === "print") { const pid = "p" + (UID++); addClip(par, pid, '<polygon points="' + pts + '"/>'); extra += '<g clip-path="url(#' + pid + ')">' + orig + "</g>"; }
        extra += '<polygon points="' + pts + '" fill="none" ' + line + ' clip-path="url(#' + cid + ')"/>';
      });
      el.insertAdjacentHTML("afterend", extra);
    });
    let labels = "";
    st.forEach(q => { const fs = Math.max(2.3, Math.min(5, q.v.best * mm * 1.1)) / (S / 100);
      labels += '<text x="' + (q.v.bx / PX).toFixed(2) + '" y="' + (q.v.by / PX).toFixed(2) + '" font-size="' + fs.toFixed(2) + '" text-anchor="middle" dominant-baseline="central" font-family="Nunito" font-weight="900" fill="#5b5270">' + q.num + '</text>'; });
    pic.insertAdjacentHTML("beforeend", labels);
    const pg = document.createElement("section"); pg.className = "page";
    pg.innerHTML = '<div class="phd" style="background:' + book.color + '"><b>' + (si + 1) + '</b><div><h2>' + sc.t + '</h2><div class="sub">Клей наліпки 1–' + st.length + ' по порядку · аркуш наліпок №' + (si + 1) + '</div></div></div>' +
      '<div class="pic"></div><div class="ft"><span>' + book.title + '</span><span>Тямко · наліпки за номерами</span></div><div class="perf"></div>';
    pg.querySelector(".pic").appendChild(pic);
    art.push(pg);

    // Аркуш наліпок
    const sp = document.createElement("section"); sp.className = "page";
    let cut = '<svg class="cutlayer" viewBox="0 0 ' + PAGEW + ' ' + PAGEH + '">';
    st.forEach((q, i) => {
      const f = q.f, p = pos[i], pad = 0.6 / mm / PX;
      const vb = (f.x0 / PX - pad) + " " + (f.y0 / PX - pad) + " " + (q.w / mm / PX) + " " + (q.h / mm / PX);
      const make = forCut => {
        const one = host.cloneNode(true);
        [...one.querySelectorAll("[data-bg]")].forEach(e => e.remove());
        const ls = leavesOf(one); ls.forEach((e, j) => { if (j !== q.k) e.remove(); });
        const el = ls[q.k], par = el.parentNode;
        one.removeAttribute("width"); one.removeAttribute("height"); one.removeAttribute("shape-rendering");
        one.setAttribute("viewBox", vb);
        if (q.poly) {
          const pts = localPts(q.poly, PM[q.k]), pid = "c" + (UID++);
          addClip(par, pid, '<polygon points="' + pts + '"/>');
          el.setAttribute("clip-path", "url(#" + pid + ")");
          if (forCut) { const lid = "l" + (UID++); addClip(par, lid, bare(el)); el.insertAdjacentHTML("afterend", '<polygon points="' + pts + '" clip-path="url(#' + lid + ')"/>'); }
        }
        return one;
      };
      const x = SHEET.x + p.x, y = SHEET.y + p.y;
      const one = make(false);
      one.insertAdjacentHTML("beforeend", '<text x="' + (f.bx / PX) + '" y="' + (f.by / PX) + '" font-size="' + (Math.max(2.1, Math.min(3.8, f.best * mm)) / (S / 100)) + '" text-anchor="middle" dominant-baseline="central" font-family="Nunito" font-weight="900" fill="' + (lum(fills[q.k]) < .55 ? "rgba(255,255,255,.85)" : "rgba(43,34,64,.6)") + '">' + q.num + '</text>');
      one.setAttribute("style", "position:absolute;left:" + x + "mm;top:" + y + "mm;width:" + q.w + "mm;height:" + q.h + "mm;overflow:hidden");
      sp.appendChild(one);
      const c = make(true); c.setAttribute("x", x); c.setAttribute("y", y); c.setAttribute("width", q.w); c.setAttribute("height", q.h);
      cut += c.outerHTML;
    });
    cut += "</svg>";
    sp.insertAdjacentHTML("afterbegin", '<div class="shd" style="color:' + book.color + '">Наліпки №' + (si + 1) + ' · ' + sc.t + ' <span>(' + st.length + ' шт.)</span></div>');
    sp.insertAdjacentHTML("beforeend", cut + '<div class="ft"><span>' + book.title + ' · аркуш наліпок ' + (si + 1) + '</span><span>надсічка за окремим файлом</span></div>');
    stick.push(sp);
    host.remove();
    console.log(book.id, sc.t, "S=" + S, "наліпок " + st.length, "друк " + pcs.filter(q => q.kind === "print").length);
  }
  document.getElementById("art-" + book.id).append(...art);
  document.getElementById("st-" + book.id).append(...stick);
}
window.__ready = true;
})().catch(e => { console.error("ERR " + e.message); window.__err = e.message; window.__ready = true; });
`;

const CSS = `
  .phd{position:absolute;left:0;right:0;top:0;height:30mm;padding:${SAFE - 2}mm ${SAFE}mm 0;display:flex;align-items:center;gap:4mm;color:#fff}
  .phd b{background:#fff;color:${C.ink};width:12mm;height:12mm;border-radius:50%;display:grid;place-items:center;font-size:6mm;flex:none}
  .phd h2{font-size:9mm}.phd .sub{font-size:4mm;font-weight:800}
  .pic{position:absolute;left:0;right:0;top:36mm;bottom:20mm;display:flex;align-items:center;justify-content:center}
  .perf{position:absolute;left:${BLEED + 12}mm;top:0;bottom:0;border-left:.3mm dashed #d6cfe2}
  .shd{position:absolute;left:13mm;top:9mm;font-size:5.5mm;font-weight:900}.shd span{color:${C.muted};font-weight:800}
`;

async function build() {
  for (const b of BOOKS) {
    const data = [{ id: b.id, title: b.title, color: b.color, scenes: b.scenes.map(sc => ({ t: sc.t, svg: sceneSvg(sc) })) }];
    const cover = L.page(`<div style="position:absolute;inset:0;background:linear-gradient(160deg,${b.color},#2b2240 140%)"></div>
      <div class="safe" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;gap:6mm">
        <div style="font-size:8mm;font-weight:900;letter-spacing:.5mm">ТЯМКО</div>
        <div style="font-size:7mm;font-weight:800;background:#fff;color:${b.color};border-radius:20mm;padding:2mm 8mm">Розмальовка наліпками за номерами</div>
        ${emoji(b.cover, 80)}<h1 style="font-size:18mm">${esc(b.title)}</h1>
        <div style="display:flex;gap:3mm">${b.scenes.map(s => emoji(s.items[s.items.length - 1].ch, 15)).join("")}</div>
        <div style="font-size:6mm;font-weight:800">8 картин · 4–8 років</div>
      </div>`);
    const howto = L.page(`${L.header("Як клеїти", "Тямко покаже!", b.color, null)}
      <div class="safe" style="top:40mm;display:flex;flex-direction:column;gap:6mm;font-size:6mm;font-weight:800;line-height:1.4">
        <div>1️⃣ Знайди аркуш наліпок з тим самим номером, що й картина.</div>
        <div>2️⃣ Клей наліпки <b>по порядку: 1, 2, 3…</b> Кожна наліпка має свій номер, як і місце на картині.</div>
        <div>3️⃣ Наступні наліпки можуть лягати поверх попередніх — так і задумано!</div>
        <div>4️⃣ Готову картину відірви по пунктиру і повісь на стіну 🖼️</div>
        <div style="margin-top:auto;font-size:3.6mm;color:${C.ink2};font-weight:600">Містить дрібні деталі. Не для дітей до 3 років. Виробник: ФОП Костенко Ольга Володимирівна, Україна.<br>${L.CREDIT}</div>
      </div>`, { bg: "#fffdf9" });
    const html = L.doc(b.title, [cover, howto, `<div id="art-${b.id}"></div>`], { css: CSS,
      script: `const DATA=${JSON.stringify(data)};const PAGEW=${PAGE.w},PAGEH=${PAGE.h};${BROWSER}` })
      .replace("<body>", `<body><div id="work" style="position:absolute;left:-9999px;top:0"></div><div id="st-${b.id}" class="sheets"></div>`);
    // Дві частини з одного розрахунку: картини і наліпки — в окремі PDF
    await renderSplit(b.id, html);
  }
}

async function renderSplit(id, html) {
  const fs = require("fs"), path = require("path");
  const file = path.join(L.CACHE, `nalipky_${id}.html`);
  fs.writeFileSync(file, html);
  let pw; try { pw = require("playwright"); } catch (e) { pw = require("/opt/node22/lib/node_modules/playwright"); }
  const br = await pw.chromium.launch();
  const p = await br.newPage();
  p.on("console", m => console.log("   ", m.text()));
  await p.goto("file://" + file);
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 600000 });
  const err = await p.evaluate(() => window.__err);
  if (err) throw new Error(err);
  await p.evaluate(() => document.fonts.ready);
  const opts = { width: PAGE.w + "mm", height: PAGE.h + "mm", printBackground: true, preferCSSPageSize: true };
  // картини: ховаємо аркуші наліпок
  await p.addStyleTag({ content: ".sheets{display:none}" });
  await p.pdf({ path: path.join(L.OUT, `nalipky_${id}_1_kartyny.pdf`), ...opts });
  // наліпки: показуємо тільки аркуші
  await p.addStyleTag({ content: "body>*:not(.sheets){display:none!important}.sheets{display:block!important}" });
  await p.pdf({ path: path.join(L.OUT, `nalipky_${id}_2_naklejky.pdf`), ...opts });
  await p.evaluate(() => document.body.classList.add("cut"));
  await p.pdf({ path: path.join(L.OUT, `nalipky_${id}_2_naklejky_VYSICHKA.pdf`), ...opts });
  await br.close();
  console.log("✓ nalipky_" + id);
}

module.exports = { build };
if (require.main === module) build().catch(e => { console.error(e); process.exit(1); });
