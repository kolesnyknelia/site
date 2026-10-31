/* Конспект курсу «Формула Claude»: дані модулів і уроків.
   Кожен урок — крок у вкладці модуля. id уроку = fc-<модуль>-<урок> (урок 3.2 → fc-3-2): за ним SendPulse веде на урок,
   а галочки учнів зберігаються за id. id не змінюємо.
   video: false — текстовий урок без відео.
   Розмітка уроку — звичайний HTML з класами сторінки (rules, note, say, link-row, table-wrap). */
(function () {
  var esc = function (s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  // [заголовок, текст] → картки правил
  var R = function (items) { return '<ul class="rules">' + items.map(function (i) { return "<li><b>" + i[0] + "</b>" + (i[1] || "") + "</li>"; }).join("") + "</ul>"; };
  var UL = function (items) { return "<ul>" + items.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ul>"; };
  var OL = function (items) { return "<ol>" + items.map(function (i) { return "<li>" + i + "</li>"; }).join("") + "</ol>"; };
  // тип: "" (порада), "warn", "secret", "skip"
  var N = function (type, title, text) { return '<div class="note ' + type + '"><div><b>' + title + "</b><p>" + text + "</p></div></div>"; };
  var LINK = function (title, sub, url, btn) { return '<div class="link-row"><span>' + title + (sub ? "<small>" + sub + "</small>" : "") + '</span><a class="btn" href="' + url + '" target="_blank" rel="noopener">' + (btn || "Відкрити") + "</a></div>"; };
  var SAY = function (items) { return '<div class="say">' + items.map(function (i) { return "<span>" + i + "</span>"; }).join("") + "</div>"; };
  var H = function (t) { return "<h4>" + t + "</h4>"; };
  var P = function (t) { return "<p>" + t + "</p>"; };
  var TABLE = function (head, rows) { return '<div class="table-wrap"><table><thead><tr>' + head.map(function (h) { return "<th>" + h + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>"; };
  // Шпаргалка уроку — окрема рамка
  var CHEAT = function (items) { return '<div class="cheat"><b>📌 Шпаргалка уроку</b>' + UL(items) + "</div>"; };
  var FLOW = function (t) { return '<div class="flow">' + t + "</div>"; };
  // Промпт з кнопкою «Скопіювати». [у дужках] — те, що людина змінює під себе
  var pn = 0;
  var PROMPT = function (title, text) {
    var id = "pr-" + (++pn);
    var body = esc(text).replace(/\[([^\]]+)\]/g, '<span class="ph">[$1]</span>');
    return '<div class="prompt"><div class="prompt-bar"><span>' + title + '</span><button class="btn" type="button" data-copy="' + id + '">Скопіювати</button></div><pre id="' + id + '">' + body + "</pre></div>";
  };
  // Скрін з підписом
  var IMG = function (src, cap, narrow) { return "<figure" + (narrow ? ' class="narrow"' : "") + '><img src="img/' + src + '" alt="' + esc(cap) + '" loading="lazy"><figcaption>' + cap + "</figcaption></figure>"; };
  // Файл для завантаження (скіл, шаблон)
  var FILE = function (title, sub, url, btn) { return '<div class="file"><span class="ico">🧰</span><div><b>' + title + "</b><small>" + sub + '</small></div><a class="btn" href="' + url + '" download>' + (btn || "Завантажити") + "</a></div>"; };
  // Що дописати в Паспорт товару
  var PASS = function (text) { return '<div class="passport"><b>У Паспорт товару</b><p>' + text + "</p></div>"; };
  // Питання-відповідь
  var QA = function (items) { return items.map(function (i) { return "<details><summary>" + i[0] + "</summary><div><p>" + i[1] + "</p></div></details>"; }).join(""); };
  window.FS_H = { R: R, UL: UL, OL: OL, N: N, LINK: LINK, SAY: SAY, H: H, P: P, TABLE: TABLE, CHEAT: CHEAT, FLOW: FLOW, PROMPT: PROMPT, IMG: IMG, FILE: FILE, PASS: PASS, QA: QA, esc: esc };
})();

window.FS_COURSE = [];
