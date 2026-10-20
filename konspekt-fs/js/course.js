/* Конспект курсу «Формула свободи»: дані модулів і уроків.
   Кожен урок — крок у вкладці модуля. id уроків і завдань не змінюємо: за ними зберігаються галочки учнів.
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
  window.FS_H = { R: R, UL: UL, OL: OL, N: N, LINK: LINK, SAY: SAY, H: H, P: P, TABLE: TABLE, CHEAT: CHEAT, FLOW: FLOW, esc: esc };
})();

window.FS_COURSE = [];
