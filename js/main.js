/* =========================================================
   Логіка лендінгу: звуки, калькулятор, приклади, форма, «поділитися»
   ========================================================= */
(function () {
  "use strict";
  var C = window.SITE_CONFIG || {};
  var CUR = C.currency || { code: "USD", sign: "$" }, USD = CUR;
  /* ---------- Акція на дати (за київським часом) ---------- */
  var P = C.promo, today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Kyiv" }).format(new Date());
  var promoOn = !!(P && C.plans && C.plans.course && today >= P.from && today <= P.to);
  var basePrice = C.plans && C.plans.course ? C.plans.course.price : 29;
  if (promoOn) { CUR = P.currency; C.plans.course.price = P.price; }
  function usd(n) { return USD.sign + Math.round(n).toLocaleString("uk-UA").replace(/,|\u00a0/g, " "); }
  function money(n) { var v = Math.round(n).toLocaleString("uk-UA").replace(/,|\u00a0/g, " "); return CUR.code === "USD" ? CUR.sign + v : v + " " + CUR.sign; }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Звуки (Web Audio, без файлів) ---------- */
  var audioCtx = null;
  var muted = false;
  try { muted = localStorage.getItem("muted") === "1"; } catch (e) {}

  function ctx() {
    if (!audioCtx) {
      var A = window.AudioContext || window.webkitAudioContext;
      if (!A) return null;
      audioCtx = new A();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }
  function tone(freq, start, dur, type, vol, slideTo) {
    var a = ctx(); if (!a) return;
    var t = a.currentTime + start;
    var o = a.createOscillator(), g = a.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  // М'які «кришталеві» звуки під світлий стиль сайту
  function chime(f, t, v) { tone(f, t || 0, .5, "sine", v || .1); tone(f * 2, t || 0, .25, "sine", (v || .1) / 4); }
  var SOUNDS = {
    pop:     function () { chime(880, 0, .08); },
    click:   function () { tone(1400, 0, .03, "sine", .05); },
    tab:     function () { chime(659, 0, .08); chime(988, .07, .06); },
    coin:    function () { chime(1047, 0, .09); chime(1568, .09, .08); },
    whoosh:  function () { tone(420, 0, .35, "sine", .05, 1100); },
    success: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { chime(f, i * .1, .08); }); },
    open:    function () { chime(587, 0, .07); chime(880, .08, .07); },
    close:   function () { chime(880, 0, .06); chime(587, .08, .05); },
    tick:    function () { tone(2200, 0, .015, "sine", .025); },
    check:   function () { chime(784, 0, .08); chime(1175, .08, .07); },
    insta:   function () { chime(1047, 0, .07); chime(1319, .07, .06); chime(1568, .14, .05); },
    flip:    function () { tone(300, 0, .18, "sine", .06, 900); chime(1175, .15, .05); }
  };
  function play(name) {
    if (muted) return;
    try { (SOUNDS[name] || SOUNDS.pop)(); } catch (e) {}
    if (navigator.vibrate && name !== "tick") { try { navigator.vibrate(12); } catch (e) {} }
  }
  window.playSound = play;

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-sound]");
    if (el) play(el.getAttribute("data-sound"));
  });

  var muteBtn = $("#muteBtn");
  function renderMute() { if (muteBtn) { muteBtn.textContent = muted ? "🔇" : "🔊"; muteBtn.setAttribute("aria-label", muted ? "Увімкнути звук" : "Вимкнути звук"); } }
  if (muteBtn) {
    renderMute();
    muteBtn.addEventListener("click", function () {
      muted = !muted;
      try { localStorage.setItem("muted", muted ? "1" : "0"); } catch (e) {}
      renderMute();
      if (!muted) play("pop");
    });
  }

  /* ---------- Toast ---------- */
  var toastEl = $("#toast"), toastT;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove("show"); }, 2400);
  }

  /* ---------- Instagram посилання ---------- */
  var igUrl = "https://instagram.com/" + (C.instagram || "");
  $$("[data-instagram]").forEach(function (a) { a.href = igUrl; a.target = "_blank"; a.rel = "noopener"; });
  $$("[data-ig-handle]").forEach(function (s) { s.textContent = "@" + (C.instagram || ""); });

  /* ---------- Поява блоків при скролі ---------- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: .12 });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  } else { $$(".reveal").forEach(function (el) { el.classList.add("in"); }); }

  /* ---------- Липка кнопка на мобільному ---------- */
  var sticky = $("#stickyCta"), hero = $("#hero"), pricing = $("#pricing");
  function onScroll() {
    if (!sticky || !hero) return;
    var y = window.scrollY, past = y > hero.offsetHeight - 80;
    var atPricing = pricing && (function () { var r = pricing.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; })();
    sticky.classList.toggle("show", past && !atPricing);
  }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---------- Калькулятор економії ---------- */
  var cSites = $("#cSites"), cPrice = $("#cPrice"), cEdits = $("#cEdits");
  function fmt(n) { return usd(n); } // калькулятор рахує в доларах
  function calc() {
    if (!cSites) return;
    var sites = +cSites.value, price = +cPrice.value, edits = +cEdits.value;
    var dev = sites * price + sites * edits * 12 * 15; // правка ~15 $ за раз, на рік
    var course = promoOn ? P.usd : basePrice;
    var hosting = C.hostingPerYear || 60; // хостинг ~$3–5/міс + домен ~$10–15/рік; піддомени — без доплат
    var save = dev - course - hosting;
    $("#oSites").textContent = sites;
    $("#oPrice").textContent = fmt(price);
    $("#oEdits").textContent = edits + " / міс";
    $("#rDev").textContent = fmt(dev);
    $("#rCourse").textContent = fmt(course);
    if ($("#rHost")) $("#rHost").textContent = fmt(hosting);
    $("#rDays").textContent = (sites * 7 + edits * 2) + " днів";
    var big = $("#rSave");
    big.textContent = fmt(Math.max(save, 0));
  }
  [cSites, cPrice, cEdits].forEach(function (i) {
    if (!i) return;
    i.addEventListener("input", function () { calc(); play("tick"); });
  });
  calc();

  /* ---------- Приклади сайтів за нішами ---------- */
  var NICHES = {
    chainyk: {
      url: "chainyk/",
      title: "Емальований чайник — сайт зі скіла «Сайт під товар»",
      chips: ["Зроблено скілом", "Форма: ім'я + телефон", "Заявки в Telegram", "Піксель Meta"],
      blocks: ["Головний екран: галерея фото, ціна зі знижкою, кнопка «Замовити»", "Переваги товару", "Характеристики і комплект", "Як замовити: 3 кроки", "Форма замовлення → заявка в Telegram", "Доставка Новою поштою, оплата при отриманні", "Оферта, політика й умови повернення"],
      why: "Такий сайт ви зробите в курсі: даєте Claude посилання на товар і ціну — скіл збирає все сам."
    },
    tovar: {
      url: "examples/tovar.html",
      title: "Товарка: продаж одного товару",
      chips: ["1 товар", "Кнопка «Купити»", "Форма: ім'я + телефон", "Таймер акції"],
      blocks: ["Головний екран: фото товару + ціна + кнопка «Замовити»", "Проблема → як товар її вирішує", "3–5 переваг з іконками", "Фото/відео в житті + відгуки покупців", "Акція: стара/нова ціна, обмежена кількість", "Форма замовлення: ім'я, телефон → заявка в Telegram", "Доставка Новою поштою, оплата при отриманні"],
      why: "Класика товарного бізнесу: реклама → лендінг → заявка → менеджер дзвонить → відправка НП."
    }
  };
  var frame = $("#exampleFrame"), openFull = $("#exampleOpen");
  function showNiche(key) {
    var n = NICHES[key]; if (!n || !frame) return;
    $$(".tab[data-niche]").forEach(function (t) { t.setAttribute("aria-selected", t.dataset.niche === key ? "true" : "false"); });
    frame.src = n.url;
    if (openFull) openFull.href = n.url;
    $("#exTitle").textContent = n.title;
    $("#exWhy").textContent = n.why;
    $("#exChips").innerHTML = n.chips.map(function (c) { return '<span class="chip">' + c + "</span>"; }).join("");
    $("#exBlocks").innerHTML = n.blocks.map(function (b) { return "<li>" + b + "</li>"; }).join("");
  }
  $$(".tab[data-niche]").forEach(function (t) {
    t.addEventListener("click", function () { showNiche(t.dataset.niche); });
  });
  showNiche("chainyk");

  /* ---------- Генератор промпту для ШІ ---------- */
  var pNiche = $("#pNiche"), pProduct = $("#pProduct"), pPrice = $("#pPrice"), pOut = $("#promptOut"), typing;
  var NICHE_TEXT = {
    tovar: { who: "товарного бізнесу (продаж одного товару)", cta: "«Замовити зі знижкою»", form: "ім'я та телефон", extra: "блок доставки Новою поштою та оплати при отриманні" }
  };
  function buildPrompt() {
    var n = NICHE_TEXT.tovar;
    var product = (pProduct.value || "").trim() || "мій товар";
    var price = (pPrice.value || "").trim();
    return "Ти — досвідчений маркетолог і веб-дизайнер.\n" +
      "Створи односторінковий сайт (лендінг) для " + n.who + ".\n\n" +
      "Продукт: " + product + (price ? "\nЦіна: " + price : "") + "\n" +
      "Мова сайту: українська.\n" +
      "Аудиторія: українці в Україні та Європі, заходять з Instagram з телефона.\n\n" +
      "Структура:\n" +
      "1. Головний екран з сильним заголовком і кнопкою " + n.cta + "\n" +
      "2. Проблема клієнта і як продукт її вирішує\n" +
      "3. Переваги (3–5 пунктів з емодзі)\n" +
      "4. " + n.extra + "\n" +
      "5. Відгуки — тільки якщо я дам справжні\n" +
      "6. Часті питання\n" +
      "7. Форма заявки: " + n.form + "\n\n" +
      "Вимоги: адаптивний під телефон, сучасний дизайн, швидке завантаження. " +
      "Не вигадуй відгуки, характеристики чи знижки — якщо чогось не вистачає, спитай мене.";
  }
  function typeOut() {
    if (!pOut) return;
    clearInterval(typing);
    var txt = buildPrompt(), i = 0;
    pOut.innerHTML = "";
    var span = document.createElement("span"), caret = document.createElement("span");
    caret.className = "caret"; pOut.appendChild(span); pOut.appendChild(caret);
    typing = setInterval(function () {
      i += 3; span.textContent = txt.slice(0, i);
      if (i % 12 === 0) play("tick");
      if (i >= txt.length) { clearInterval(typing); span.textContent = txt; }
    }, 16);
  }
  var genBtn = $("#genPrompt");
  if (genBtn) genBtn.addEventListener("click", typeOut);
  var copyBtn = $("#copyPrompt");
  if (copyBtn) copyBtn.addEventListener("click", function () {
    copyText(buildPrompt(), "Промпт скопійовано! Вставте його в ChatGPT або Claude ✨");
  });

  function copyText(text, msg) {
    function ok() { toast(msg || "Скопійовано!"); }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(ok, fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { toast("Не вдалося скопіювати"); }
      document.body.removeChild(ta);
    }
  }

  /* ---------- Кроки «від ідеї до сайту» ---------- */
  var steps = $$(".step"), bar = $("#stepsBar"), note = $("#stepsNote");
  function renderSteps() {
    var done = steps.filter(function (s) { return s.classList.contains("done"); }).length;
    if (bar) bar.style.width = (done / steps.length * 100) + "%";
    if (note) note.textContent = done === steps.length
      ? "🎉 Сайт готовий і працює! Саме так це буде на курсі."
      : "Натискайте на кроки: " + done + " з " + steps.length + " виконано";
    return done;
  }
  steps.forEach(function (s) {
    s.setAttribute("tabindex", "0"); s.setAttribute("role", "button");
    function toggle() {
      s.classList.toggle("done");
      var d = renderSteps();
      if (d === steps.length) { play("success"); confetti(); } else play(s.classList.contains("done") ? "check" : "click");
    }
    s.addEventListener("click", toggle);
    s.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
  });
  renderSteps();

  /* ---------- Відгуки ---------- */
  var revWrap = $("#reviews");
  var COLORS = ["#4f6e60", "#d9a774", "#7f9fb0", "#9db3a6", "#d9a6a0"];
  function esc(s) { return String(s || "").replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  // Показуємо блок відгуків лише коли є справжні (без позначки demo)
  var realReviews = (C.reviews || []).filter(function (r) { return !r.demo; });
  var revSec = $("#reviews-sec");
  if (revSec) revSec.hidden = !realReviews.length;
  if (revWrap && realReviews.length) {
    revWrap.innerHTML = realReviews.map(function (r, i) {
      var initials = esc((r.name || "?").trim().charAt(0));
      return '<article class="review">' +
        '<div class="review-head"><div class="avatar" style="background:' + COLORS[i % COLORS.length] + '">' + initials + "</div>" +
        "<div><b>" + esc(r.name) + "</b><small>" + esc(r.role) + "</small></div></div>" +
        '<div class="stars">★★★★★</div>' +
        (r.image ? '<img src="' + esc(r.image) + '" alt="Відгук ' + esc(r.name) + '" loading="lazy">' : "") +
        "<p>" + esc(r.text) + "</p>" +
        (r.result ? '<div class="result">📈 ' + esc(r.result) + "</div>" : "") +
        "</article>";
    }).join("");
  }
  $$("[data-rev]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!revWrap) return;
      var card = revWrap.querySelector(".review");
      var w = card ? card.offsetWidth + 16 : 300;
      revWrap.scrollBy({ left: +b.dataset.rev * w, behavior: "smooth" });
    });
  });

  /* ---------- Ціни з конфігу ---------- */
  $$("[data-plan-price]").forEach(function (el) {
    var p = C.plans && C.plans[el.dataset.planPrice]; if (p) el.textContent = money(p.price);
  });
  $$("[data-plan-old]").forEach(function (el) {
    var p = C.plans && C.plans[el.dataset.planOld]; if (p && p.old) el.textContent = money(p.old);
  });
  if (promoOn) {
    var bar = $("#promoBar"); if (bar) { bar.querySelector("span").innerHTML = P.text; bar.hidden = false; }
    $$("[data-promo-old]").forEach(function (el) { el.textContent = usd(basePrice); el.hidden = false; });
    $$("[data-promo-tag]").forEach(function (el) { el.textContent = P.tag; });
    var badges = $(".hero-badges"); if (badges && P.badge) { var s = document.createElement("span"); s.className = "chip chip-promo"; s.textContent = P.badge; badges.insertBefore(s, badges.firstChild); }
    document.body.classList.add("is-promo");
    /* Скільки лишилось до кінця акції (кінець дня P.to за Києвом) */
    var left = $("#promoLeft");
    var end = new Date(P.to + "T23:59:59+02:00").getTime(); // кінець P.to у Києві — літній час закінчився 25.10, тож UTC+2
    (function tick() {
      var s = Math.max(0, Math.floor((end - Date.now()) / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
      if (left) left.textContent = s ? "· залишилось " + (d ? d + " дн " : "") + h + " год " + m + " хв" : "";
      setTimeout(tick, 30000);
    })();
    /* Гарбузики на першому екрані */
    var hero = $("#hero");
    if (hero && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      var box = document.createElement("div"); box.className = "pumpkins"; box.setAttribute("aria-hidden", "true");
      for (var i = 0; i < 9; i++) {
        var pk = document.createElement("i"); pk.textContent = i % 3 === 2 ? "🍂" : "🎃";
        pk.style.left = (5 + i * 11 + Math.random() * 4) + "%";
        pk.style.fontSize = (18 + Math.random() * 20) + "px";
        pk.style.animationDuration = (9 + Math.random() * 7) + "s";
        pk.style.animationDelay = (-Math.random() * 12) + "s";
        box.appendChild(pk);
      }
      hero.appendChild(box);
    }
  }

  /* ---------- UTM-мітки з реклами ---------- */
  var utm = {};
  try {
    var qs = new URLSearchParams(location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"].forEach(function (k) {
      if (qs.get(k)) utm[k] = qs.get(k);
    });
    if (Object.keys(utm).length) sessionStorage.setItem("utm", JSON.stringify(utm));
    else utm = JSON.parse(sessionStorage.getItem("utm") || "{}");
  } catch (e) {}

  /* ---------- Модальне вікно заявки ---------- */
  var modal = $("#orderModal"), form = $("#orderForm"), currentPlan = "course";
  function openModal(plan) {
    currentPlan = plan || "course";
    var p = (C.plans && C.plans[currentPlan]) || { name: "", price: "" };
    $("#planPill").textContent = p.name + (p.price ? " — " + money(p.price) : "");
    form.style.display = "";
    modal.classList.add("open"); document.body.style.overflow = "hidden";
    play("open");
    setTimeout(function () { var f = $("#fName"); if (f) f.focus(); }, 250);
    track("InitiateCheckout", { value: p.price, currency: CUR.code, content_name: p.name });
  }
  function closeModal() { modal.classList.remove("open"); document.body.style.overflow = ""; play("close"); }
  $$("[data-order]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); openModal(b.dataset.order); }); });
  $$("[data-close]").forEach(function (b) { b.addEventListener("click", closeModal); });
  if (modal) modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal && modal.classList.contains("open")) closeModal(); });

  // Маска телефону: залишаємо + і цифри
  var phone = $("#fPhone");
  if (phone) phone.addEventListener("input", function () {
    var v = phone.value.replace(/[^\d+]/g, "");
    if (v && v[0] !== "+") v = "+" + v;
    phone.value = v.slice(0, 16);
  });

  /* ---------- Мої справжні сайти: показ у телефоні по кліку ---------- */
  var workFrame = $("#workFrame"), workCover = $("#workCover"), workOpen = $("#workOpen");
  $$("[data-work]").forEach(function (t) {
    t.addEventListener("click", function () {
      $$("[data-work]").forEach(function (x) { x.setAttribute("aria-selected", x === t ? "true" : "false"); });
      workFrame.src = t.dataset.work; workFrame.hidden = false;
      if (workCover) workCover.hidden = true;
      workOpen.href = t.dataset.work; workOpen.hidden = false;
    });
  });

  /* ---------- Пошта тільки Gmail: виправлення типових описок ---------- */
  var GMAIL_TYPOS = /@(gmail\.(con|cm|co|cim|om|comm|ru|ua|com\.ua)|gmal\.com|gmai\.com|gamil\.com|gmial\.com|gnail\.com|gmaill\.com|googlemail\.com|g\.mail\.com)$/;
  function fixGmail(v) {
    v = (v || "").trim().toLowerCase().replace(/\s+/g, "");
    if (/@$/.test(v)) return v + "gmail.com";
    if (v && v.indexOf("@") === -1) return v;
    return v.replace(GMAIL_TYPOS, "@gmail.com");
  }
  function emailHint(bad) { var h = $("#emailHint"); if (h) h.classList.toggle("bad", !!bad); }
  var emailInput = $("#fEmail");
  if (emailInput) emailInput.addEventListener("blur", function () {
    var v = emailInput.value.trim();
    if (!v) return;
    var f = fixGmail(v);
    if (f !== v.toLowerCase()) { emailInput.value = f; toast("Виправили пошту на " + f); play("check"); }
    emailHint(!/^[a-z0-9._%+-]+@gmail\.com$/.test(emailInput.value));
  });

  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("#fName").value.trim(), email = $("#fEmail").value.trim(), tel = $("#fPhone").value.trim();
    if (name.length < 2) { toast("Вкажіть, будь ласка, ім'я"); play("whoosh"); $("#fName").focus(); return; }
    email = fixGmail(email); $("#fEmail").value = email;
    if (!/^[a-z0-9._%+-]+@gmail\.com$/.test(email)) {
      toast("Вкажіть пошту Gmail (…@gmail.com) — доступ до уроків працює тільки з нею");
      emailHint(true); play("whoosh"); $("#fEmail").focus(); return;
    }
    if (tel && tel.replace(/\D/g, "").length < 9) { toast("Перевірте номер телефону"); play("whoosh"); $("#fPhone").focus(); return; }
    var p = (C.plans && C.plans[currentPlan]) || {};
    $("#fUtm").value = JSON.stringify(utm);
    track("Lead", { value: p.price, currency: CUR.code, content_name: p.name });
    var btn = form.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Переходимо до оплати…";
    play("success");
    // Справжня відправка форми: сервер збереже заявку, повідомить у Telegram і відкриє оплату WayForPay
    form.action = C.checkoutUrl || "api/order.php";
    form.method = "post";
    setTimeout(function () { form.submit(); }, 250);
  });

  /* ---------- Поділитися ---------- */
  var shareUrl = location.href.split("#")[0].split("?")[0];
  var shareText = "Дивись: курс, як зробити сайт за 1 вечір за допомогою ШІ — без програмістів 🚀";
  var SHARE = {
    native: function () {
      if (navigator.share) navigator.share({ title: document.title, text: shareText, url: shareUrl }).catch(function () {});
      else copyText(shareUrl, "Посилання скопійовано! 🔗");
    },
    telegram: "https://t.me/share/url?url=" + encodeURIComponent(shareUrl) + "&text=" + encodeURIComponent(shareText),
    viber: "viber://forward?text=" + encodeURIComponent(shareText + " " + shareUrl),
    whatsapp: "https://wa.me/?text=" + encodeURIComponent(shareText + " " + shareUrl),
    facebook: "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(shareUrl),
    copy: function () { copyText(shareUrl, "Посилання скопійовано! 🔗"); }
  };
  $$("[data-share]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      var s = SHARE[b.dataset.share];
      if (typeof s === "function") s(); else if (s) window.open(s, "_blank", "noopener");
      track("Share", { method: b.dataset.share });
    });
  });

  /* ---------- Конфеті ---------- */
  function confetti() {
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var cols = ["#4f6e60", "#9db3a6", "#f1d6b8", "#d9a774", "#7f9fb0", "#d9a6a0"];
    for (var i = 0; i < 80; i++) {
      var c = document.createElement("i");
      c.className = "confetti";
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = cols[i % cols.length];
      c.style.animationDuration = (1.6 + Math.random() * 1.6) + "s";
      c.style.animationDelay = (Math.random() * .4) + "s";
      c.style.borderRadius = Math.random() > .5 ? "50%" : "2px";
      document.body.appendChild(c);
      setTimeout(function (el) { el.remove(); }, 3800, c);
    }
  }
  window.confetti = confetti;

  /* ---------- Meta Pixel ---------- */
  function track(ev, params) {
    if (window.fbq) {
      var std = ["Lead", "InitiateCheckout", "ViewContent", "Contact"];
      window.fbq(std.indexOf(ev) > -1 ? "track" : "trackCustom", ev, params || {});
    }
  }
  if (C.metaPixelId) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", C.metaPixelId); window.fbq("track", "PageView");
  }
  $$("[data-instagram]").forEach(function (a) { a.addEventListener("click", function () { track("Contact", { method: "instagram" }); }); });

  /* ---------- Підтримка (help-бот у Telegram) ---------- */
  var helpUrl = C.helpBot || (C.telegram ? "https://t.me/" + C.telegram : "");
  $$("[data-help]").forEach(function (a) {
    if (!helpUrl) { a.style.display = "none"; return; }
    a.href = helpUrl; a.target = "_blank"; a.rel = "noopener";
    a.addEventListener("click", function () { track("Contact", { method: "help_bot" }); });
  });

  /* ---------- Microsoft Clarity: теплові карти й записи сесій (куди дивляться й натискають) ---------- */
  if (C.clarityId) {
    (function (c, l, a, r, i, t, y) { c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i; y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", C.clarityId);
  }
})();
