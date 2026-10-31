/* Конспект «Формула Claude». Збирає сторінку з window.FS_COURSE: вкладки модулів, уроки-кроки, галочки, зміст, пошук */
(function () {
  var C = window.FS_COURSE, esc = window.FS_H.esc;
  var KEY = "konspekt-fc-tasks", BKEY = "konspekt-fc-module";
  var main = document.getElementById("content"), cardsBox = document.getElementById("blockCards");
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- вкладки і модулі ---------- */
  C.forEach(function (m, mi) {
    var c = document.createElement("button");
    c.className = "bcard" + (m.tab === "Бонус" ? " bonus" : "");
    c.setAttribute("role", "tab"); c.dataset.block = m.id;
    c.innerHTML = "<small>" + m.icon + " " + esc(m.tab) + "</small><b>" + esc(m.title) + '</b><span class="mini"><i></i></span>';
    cardsBox.appendChild(c);

    var a = document.createElement("article");
    a.className = "block"; a.dataset.block = m.id; a.id = m.id; a.hidden = true;
    var html = '<div class="intro" data-icon="' + m.icon + '"><span class="eyebrow">' + esc(m.tab) + "</span><h1>" + esc(m.title) + '</h1><p class="lead">' + m.lead + '</p><div class="meta">' +
      (m.time ? '<span class="chip">⏱ ' + esc(m.time) + "</span>" : "") + '<span class="chip">📌 ' + m.lessons.length + " " + plural(m.lessons.length) + "</span>" +
      (m.need ? '<span class="chip">🧰 ' + esc(m.need) + "</span>" : "") + '<span class="chip vid">🎬 ' + esc(m.video || "Відео: урок " + m.n + " у SendPulse") + "</span></div>" +
      (m.why ? '<div class="why"><b>Чому так</b><p>' + m.why + "</p></div>" : "") + "</div>";
    m.lessons.forEach(function (l) {
      html += '<section class="step" id="' + l.id + '" data-title="' + esc(l.title) + '"><div class="step-head"><span class="step-n">' + esc(l.n) + "</span><div><h3>" + esc(l.title) + "</h3>" +
        '<div class="lesson-chips">' + (l.time ? '<span class="chip">' + esc(l.time) + "</span>" : "") + (l.optional ? '<span class="chip">за бажанням</span>' : "") + "</div></div></div>" + l.html;
      if (l.tasks && l.tasks.length) {
        html += '<p class="tasks-title">Що зробити</p><div class="tasks">' + l.tasks.map(function (t, i) {
          return '<label class="task"><input type="checkbox" id="' + l.id + "-t" + (i + 1) + '"><span class="box"></span><span>' + t + "</span></label>";
        }).join("") + "</div>";
      }
      html += "</section>";
    });
    if (m.checkpoint) html += '<div class="checkpoint" id="fc-' + m.n + '-dz"><b>Контрольна точка · домашнє завдання</b><p>Далі йдемо, коли це є у вас:</p><ul>' + m.checkpoint.map(function (c) { return "<li>" + c + "</li>"; }).join("") + "</ul>" +
      (m.send ? '<p class="send"><b>Що надіслати:</b> ' + m.send + "</p>" : "") + "</div>";
    var next = C[mi + 1];
    if (next) html += '<div class="finish"><h3>' + esc(m.title) + ' — пройдено?</h3><p>Відмітьте галочки вище, допишіть Паспорт товару — і переходьте далі.</p><div class="row"><a class="btn" href="#" data-go="' + next.id + '">Далі: ' + esc(next.title) + " →</a></div></div>";
    else html += '<div class="finish"><h3>Ви пройшли Формулу 🎉</h3><p>Наступний товар — новий Паспорт товару і той самий маршрут: модулі 2 → 3 → 4 → 5 → 8.</p><div class="row"><a class="btn soft" href="#" data-go="' + C[0].id + '">На початок</a></div></div>';
    a.innerHTML = html;
    main.appendChild(a);
  });
  function plural(n) { var d = n % 10, h = n % 100; return d === 1 && h !== 11 ? "крок" : d >= 2 && d <= 4 && (h < 12 || h > 14) ? "кроки" : "кроків"; }

  var blocks = [].slice.call(main.querySelectorAll("article.block"));
  var cards = [].slice.call(cardsBox.querySelectorAll(".bcard"));
  var boxes = [].slice.call(main.querySelectorAll(".task input"));
  var current = null;

  /* ---------- галочки ---------- */
  var saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
  boxes.forEach(function (b) { b.checked = !!saved[b.id]; });
  function setRing(el, txt, p, label) { el.style.setProperty("--p", p); txt.textContent = label; }
  function progress() {
    var all = 0, allDone = 0, state = {};
    blocks.forEach(function (b, i) {
      var bx = [].slice.call(b.querySelectorAll(".task input")), d = bx.filter(function (x) { return x.checked; }).length;
      all += bx.length; allDone += d;
      cards[i].querySelector(".mini i").style.width = (bx.length ? d / bx.length * 100 : 0) + "%";
      cards[i].classList.toggle("done", bx.length > 0 && d === bx.length);
      if (!b.hidden) setRing(document.getElementById("ringBlock"), document.getElementById("ringBlockTxt"), bx.length ? d / bx.length * 100 : 0, d + "/" + bx.length);
    });
    var pAll = all ? Math.round(allDone / all * 100) : 0;
    setRing(document.getElementById("ringAll"), document.getElementById("ringAllTxt"), pAll, pAll + "%");
    boxes.forEach(function (b) { if (b.checked) state[b.id] = true; });
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  boxes.forEach(function (b) { b.addEventListener("change", progress); });

  /* ---------- зміст модуля справа ---------- */
  var nav = document.getElementById("outlineNav"), search = document.getElementById("search");
  function navLink(l, sub) {
    var a = document.createElement("a"); a.href = "#" + l.id;
    var i = document.createElement("i"); i.textContent = l.n; a.appendChild(i);
    var s = document.createElement("span"); s.textContent = l.title;
    if (sub) { var sm = document.createElement("small"); sm.textContent = sub; s.appendChild(sm); }
    a.appendChild(s); return a;
  }
  function buildOutline() {
    var m = C[blocks.indexOf(current)];
    nav.innerHTML = "";
    document.getElementById("outlineTitle").textContent = m.tab + " · " + m.title;
    document.getElementById("outlineSub").textContent = m.lessons.length + " " + plural(m.lessons.length);
    m.lessons.forEach(function (l) { nav.appendChild(navLink(l)); });
  }

  /* ---------- пошук по всіх уроках ---------- */
  var index = [];
  C.forEach(function (m) { m.lessons.forEach(function (l) {
    var d = document.createElement("div"); d.innerHTML = l.html;
    index.push({ l: l, m: m, t: (l.n + " " + l.title + " " + d.textContent + " " + (l.tasks || []).join(" ")).toLowerCase() });
  }); });
  search.addEventListener("input", function () {
    var q = search.value.trim().toLowerCase();
    if (!q) { buildOutline(); return; }
    nav.innerHTML = "";
    var words = q.split(/\s+/), found = index.filter(function (x) { return words.every(function (w) { return x.t.indexOf(w) >= 0; }); });
    found.slice(0, 30).forEach(function (x) { nav.appendChild(navLink(x.l, x.m.title)); });
    if (!found.length) { var e = document.createElement("div"); e.className = "empty"; e.textContent = "Нічого не знайдено"; nav.appendChild(e); }
  });

  /* ---------- перемикання модулів ---------- */
  function show(id, save) {
    var b = blocks.filter(function (x) { return x.dataset.block === id; })[0] || blocks[0];
    current = b;
    blocks.forEach(function (x) { x.hidden = x !== b; });
    cards.forEach(function (c) { var on = c.dataset.block === b.dataset.block; c.setAttribute("aria-selected", on ? "true" : "false"); if (on) c.scrollIntoView({ block: "nearest", inline: "nearest" }); });
    if (search.value.trim()) search.dispatchEvent(new Event("input")); else buildOutline();
    if (save) { try { localStorage.setItem(BKEY, b.dataset.block); } catch (e) {} }
    progress();
  }
  function blockOf(id) { var el = id && document.getElementById(id), b = el && el.closest("article.block"); return b ? b.dataset.block : null; }
  function goHash() { var id = decodeURIComponent(location.hash.slice(1)), n = blockOf(id); if (n) { show(n, true); var el = document.getElementById(id); if (el) el.scrollIntoView(); } }
  cards.forEach(function (c) { c.addEventListener("click", function () { show(c.dataset.block, true); history.replaceState(null, "", location.pathname + location.search); scrollTo({ top: 0 }); }); });
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-go]"); if (!a) return;
    e.preventDefault(); show(a.dataset.go, true);
    history.replaceState(null, "", location.pathname + location.search); scrollTo({ top: 0 });
  });
  addEventListener("hashchange", goHash);

  var start = blockOf(decodeURIComponent(location.hash.slice(1)));
  if (!start) { try { start = localStorage.getItem(BKEY); } catch (e) {} }
  show(start || C[0].id, false);
  if (location.hash) { var el0 = document.getElementById(decodeURIComponent(location.hash.slice(1))); if (el0) setTimeout(function () { el0.scrollIntoView(); }, 50); }

  /* ---------- «Скопіювати» ---------- */
  main.querySelectorAll("[data-copy]").forEach(function (b) {
    var t0 = b.textContent;
    b.addEventListener("click", function () {
      var el = document.getElementById(b.dataset.copy);
      function sel() { var r = document.createRange(); r.selectNodeContents(el); var w = getSelection(); w.removeAllRanges(); w.addRange(r); b.textContent = "Виділено — Ctrl+C"; }
      try { navigator.clipboard.writeText(el.textContent).then(function () { b.textContent = "Скопійовано ✓"; setTimeout(function () { b.textContent = t0; }, 1800); }, sel); } catch (e) { sel(); }
    });
  });
})();
