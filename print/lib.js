/* =========================================================
   Спільна бібліотека генератора друкарських макетів «Тямко»
   - сторінка A4 з вильотами 3 мм (216×303 мм), безпечне поле 10 мм від обрізу
   - ілюстрації Twemoji (CC-BY 4.0), шрифт Nunito (OFL) — завантажуються в print/.cache
   - рендер у PDF через Chromium (Playwright); векторна графіка, шрифт вбудовано
   - файл висічки (контури різання) — окремий PDF того самого розміру
   ========================================================= */
"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = __dirname;
const CACHE = path.join(ROOT, ".cache");
const OUT = path.join(ROOT, "out");
const TW = path.join(CACHE, "twemoji");

const BLEED = 3;                       // виліт, мм
const TRIM = { w: 210, h: 297 };       // обрізний формат A4
const PAGE = { w: TRIM.w + 2 * BLEED, h: TRIM.h + 2 * BLEED };
const SAFE = BLEED + 10;               // безпечне поле від краю сторінки PDF

const COLORS = {
  ink: "#2b2240", ink2: "#5b5270", muted: "#9a92ad", line: "#e9dcc8", cream: "#fff7ec",
  coral: "#ff7a59", sun: "#ffc93c", mint: "#4fc29f", sky: "#5b9dff", lilac: "#9b7bff", pink: "#ff8fb1"
};

/* ---------- Ресурси ---------- */
function ensureAssets() {
  fs.mkdirSync(CACHE, { recursive: true });
  if (!fs.existsSync(path.join(TW, "1f989.svg"))) {
    console.log("Завантажую Twemoji…");
    const tgz = path.join(CACHE, "twemoji.tgz");
    execSync(`curl -sSL -o "${tgz}" https://registry.npmjs.org/@twemoji/svg/-/svg-15.0.0.tgz`);
    fs.mkdirSync(TW, { recursive: true });
    execSync(`tar -xzf "${tgz}" -C "${TW}" --strip-components=1`);
  }
  for (const w of [600, 800, 900]) {
    const f = path.join(CACHE, `nunito-${w}.ttf`);
    if (fs.existsSync(f)) continue;
    console.log(`Завантажую шрифт Nunito ${w}…`);
    const css = execSync(`curl -sS -A "Mozilla/4.0" "https://fonts.googleapis.com/css2?family=Nunito:wght@${w}"`).toString();
    const url = (css.match(/https:\/\/[^)]+/) || [])[0];
    if (!url) throw new Error("Не вдалося отримати шрифт Nunito");
    execSync(`curl -sS -o "${f}" "${url}"`);
  }
}

/* ---------- Twemoji ---------- */
const svgCache = {};
function codepoints(ch) {
  const cps = Array.from(ch).map(c => c.codePointAt(0).toString(16));
  const hasZwj = cps.includes("200d");
  return hasZwj ? cps.join("-") : cps.filter(c => c !== "fe0f").join("-");
}
function emojiInner(ch) {
  if (svgCache[ch]) return svgCache[ch];
  let f = path.join(TW, codepoints(ch) + ".svg");
  if (!fs.existsSync(f)) f = path.join(TW, Array.from(ch).map(c => c.codePointAt(0).toString(16)).join("-") + ".svg");
  if (!fs.existsSync(f)) throw new Error("Немає ілюстрації для " + ch + " (" + codepoints(ch) + ")");
  const s = fs.readFileSync(f, "utf8").replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return (svgCache[ch] = s);
}
/** Емодзі як вбудований вектор. size — у мм (число) або будь-яка CSS-довжина */
function emoji(ch, size = 20, style = "") {
  const s = typeof size === "number" ? size + "mm" : size;
  return `<svg class="em" viewBox="0 0 36 36" style="width:${s};height:${s};${style}">${emojiInner(ch)}</svg>`;
}
/** Емодзі всередині іншого SVG (координати в одиницях батьківського SVG) */
function emojiAt(ch, x, y, size, extra = "") {
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 36 36" ${extra}>${emojiInner(ch)}</svg>`;
}

/* ---------- Сторінки ---------- */
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function baseCss(extra = "") {
  const font = w => `@font-face{font-family:Nunito;font-weight:${w};src:url("file://${path.join(CACHE, `nunito-${w}.ttf`)}")}`;
  return `${font(600)}${font(800)}${font(900)}
  @page{size:${PAGE.w}mm ${PAGE.h}mm;margin:0}
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{font-family:Nunito,sans-serif;font-weight:600;color:${COLORS.ink};-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{width:${PAGE.w}mm;height:${PAGE.h}mm;position:relative;overflow:hidden;page-break-after:always;background:#fff}
  .safe{position:absolute;left:${SAFE}mm;top:${SAFE}mm;right:${SAFE}mm;bottom:${SAFE}mm}
  .em{display:inline-block;vertical-align:middle;overflow:visible}
  .cutlayer{position:absolute;left:0;top:0;width:${PAGE.w}mm;height:${PAGE.h}mm;display:none}
  body.cut .page>*:not(.cutlayer){visibility:hidden}
  body.cut .page{background:#fff!important}
  body.cut .cutlayer{display:block}
  .cutlayer *{fill:none!important;stroke:#e6007e!important;stroke-width:1px!important;vector-effect:non-scaling-stroke}
  .cutlayer text{display:none}
  h1,h2,h3{font-weight:900;line-height:1.1}
  .hd{position:absolute;left:0;right:0;top:0;height:${SAFE + 16}mm;padding:${SAFE - 2}mm ${SAFE}mm 0;display:flex;align-items:center;gap:4mm;color:#fff}
  .hd h2{font-size:9mm}
  .hd .sub{font-size:4.2mm;font-weight:800;opacity:.95}
  .hd .num{margin-left:auto;background:#fff;color:${COLORS.ink};border-radius:50%;width:11mm;height:11mm;display:grid;place-items:center;font-weight:900;font-size:5mm;flex:none}
  .ft{position:absolute;left:${SAFE}mm;right:${SAFE}mm;bottom:${BLEED + 5}mm;display:flex;justify-content:space-between;font-size:2.6mm;color:${COLORS.muted}}
  ${extra}`;
}

/** Шапка сторінки з кольоровою плашкою (заходить у виліт) */
function header(title, sub, color, num, icon = "🦉") {
  return `<div class="hd" style="background:${color}">${emoji(icon, 12)}<div><h2>${esc(title)}</h2>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}</div>${num != null ? `<div class="num">${num}</div>` : ""}</div>`;
}
function footer(left, right = "Тямко · розвивальні набори") {
  return `<div class="ft"><span>${esc(left)}</span><span>${esc(right)}</span></div>`;
}
/** Шар висічки: масив SVG-елементів у мм (координати сторінки PDF з вильотами) */
function cutLayer(shapes) {
  return shapes && shapes.length ? `<svg class="cutlayer" viewBox="0 0 ${PAGE.w} ${PAGE.h}">${shapes.join("")}</svg>` : "";
}
function page(inner, { bg = "#fff", cut = null, cls = "" } = {}) {
  return `<section class="page ${cls}" style="background:${bg}">${inner}${cutLayer(cut)}</section>`;
}

function doc(title, pages, { css = "", script = "", size = PAGE } = {}) {
  const pageCss = size === PAGE ? "" : `@page{size:${size.w}mm ${size.h}mm;margin:0}.page{width:${size.w}mm;height:${size.h}mm}.cutlayer{width:${size.w}mm;height:${size.h}mm}`;
  return `<!doctype html><html lang="uk"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>${baseCss(css)}${pageCss}</style></head><body>${pages.join("\n")}
<script>window.__ready=true;</script>${script ? `<script>window.__ready=false;${script}</script>` : ""}</body></html>`;
}

/* ---------- Рендер ---------- */
let browser = null;
async function getBrowser() {
  if (browser) return browser;
  let pw;
  try { pw = require("playwright"); } catch (e) { pw = require("/opt/node22/lib/node_modules/playwright"); }
  browser = await pw.chromium.launch();
  return browser;
}
/**
 * Зберігає PDF. withCut — додатково <name>_VYSICHKA.pdf з самими контурами різання.
 * preview — PNG першої сторінки для перевірки.
 */
async function render(name, html, { withCut = false, size = PAGE } = {}) {
  fs.mkdirSync(OUT, { recursive: true });
  const htmlFile = path.join(CACHE, name + ".html");
  fs.writeFileSync(htmlFile, html);
  const b = await getBrowser();
  const p = await b.newPage();
  await p.goto("file://" + htmlFile);
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  await p.evaluate(() => document.fonts.ready);
  const pdfOpts = { width: size.w + "mm", height: size.h + "mm", printBackground: true, preferCSSPageSize: true };
  await p.pdf({ path: path.join(OUT, name + ".pdf"), ...pdfOpts });
  if (withCut) {
    await p.evaluate(() => document.body.classList.add("cut"));
    await p.pdf({ path: path.join(OUT, name + "_VYSICHKA.pdf"), ...pdfOpts });
  }
  await p.close();
  console.log("✓", name + ".pdf" + (withCut ? " + висічка" : ""));
}
async function done() { if (browser) await browser.close(); browser = null; }

/** Простий детермінований генератор випадкових чисел (однаковий результат при кожному запуску) */
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const CREDIT = "Ілюстрації: Twemoji © Twitter, Inc. та учасники проєкту, ліцензія CC-BY 4.0";

module.exports = { ensureAssets, emoji, emojiAt, emojiInner, header, footer, page, doc, render, done, cutLayer, esc, rng,
  BLEED, TRIM, PAGE, SAFE, COLORS, CREDIT, OUT, CACHE };
