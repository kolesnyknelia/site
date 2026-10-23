/* =========================================================
   Інтерактив і анімації: лічильники, паралакс, «до/після»,
   міні-тест, гортання прикладів у телефоні
   ========================================================= */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var play = function (n) { if (window.playSound) window.playSound(n); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Заголовок з'являється по словах ---------- */
  $$("[data-split]").forEach(function (h) {
    if (reduce) return;
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w.trim()) { frag.appendChild(document.createTextNode(w)); return; }
            var s = document.createElement("span");
            s.className = "split-word"; s.textContent = w; s.style.animationDelay = (0.08 * i++) + "s";
            frag.appendChild(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else walk(n);
      });
    })(h);
  });

  /* ---------- Прогрес прокрутки, тінь шапки, паралакс ---------- */
  var bar = $("#progressTop"), top = $("#topbar"), par = $$("[data-parallax]"), ticking = false;
  function onScroll() {
    var h = document.documentElement, max = h.scrollHeight - innerHeight;
    if (bar) bar.style.width = (max > 0 ? scrollY / max * 100 : 0) + "%";
    if (top) top.classList.toggle("scrolled", scrollY > 10);
    if (!reduce) par.forEach(function (img) {
      var r = img.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      img.style.transform = "translateY(" + (-(r.top) * parseFloat(img.dataset.parallax) - 40) + "px)";
    });
    ticking = false;
  }
  addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- Лічильники ---------- */
  function countUp(el) {
    var to = +el.dataset.count, suf = el.dataset.suffix || "", t0 = null, dur = 1600;
    if (reduce) { el.textContent = to.toLocaleString("uk-UA") + suf; return; }
    (function step(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur), v = Math.round(to * (1 - Math.pow(1 - k, 3)));
      el.textContent = v.toLocaleString("uk-UA").replace(/ /g, " ") + (k === 1 ? suf : "");
      if (k < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  if ("IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); cio.unobserve(e.target); } });
    }, { threshold: .6 });
    $$("[data-count]").forEach(function (el) { cio.observe(el); });
  } else $$("[data-count]").forEach(countUp);

  /* ---------- Демо-сповіщення на першому екрані ---------- */
  var NOTES = [
    ["✨", "Ваш сайт опубліковано", "Так це виглядатиме у вас · демо"],
    ["🛎", "Нова заявка з сайту", "Ім'я + телефон — одразу в Telegram · демо"],
    ["💳", "Оплату отримано", "WayForPay → доступ автоматично · демо"],
    ["📈", "Реклама веде на ваш сайт", "Піксель Meta рахує заявки · демо"]
  ];
  var notif = $("#heroNotif"), ni = 0;
  if (notif && !reduce) setInterval(function () {
    notif.classList.add("hide");
    setTimeout(function () {
      ni = (ni + 1) % NOTES.length;
      notif.querySelector(".n-ico").textContent = NOTES[ni][0];
      $("#notifTitle").textContent = NOTES[ni][1];
      $("#notifText").textContent = NOTES[ni][2];
      notif.classList.remove("hide");
    }, 450);
  }, 3600);
  if (notif) { $("#notifTitle").textContent = NOTES[0][1]; $("#notifText").textContent = NOTES[0][2]; notif.querySelector(".n-ico").textContent = NOTES[0][0]; }

  /* ---------- Кнопки «тягнуться» за курсором (десктоп) ---------- */
  if (!reduce && matchMedia("(hover: hover)").matches) $$("[data-magnet]").forEach(function (b) {
    b.addEventListener("mousemove", function (e) {
      var r = b.getBoundingClientRect();
      b.style.transform = "translate(" + (e.clientX - r.left - r.width / 2) * .15 + "px," + (e.clientY - r.top - r.height / 2) * .25 + "px)";
    });
    b.addEventListener("mouseleave", function () { b.style.transform = ""; });
  });

  /* ---------- Заливка повзунків калькулятора ---------- */
  $$("input[type=range]").forEach(function (r) {
    function fill() { r.style.setProperty("--p", ((r.value - r.min) / (r.max - r.min) * 100) + "%"); }
    r.addEventListener("input", fill); fill();
  });

  /* ---------- Перемикач «Як зараз / Після навчання» ---------- */
  var sw = $("#baSwitch"), card = $("#baCard");
  function setBA(after) {
    if (!sw) return;
    var btns = $$("button", sw), on = btns[after ? 1 : 0], knob = $(".knob", sw);
    btns.forEach(function (b) { b.setAttribute("aria-pressed", b === on ? "true" : "false"); });
    knob.style.width = on.offsetWidth + "px";
    knob.style.transform = "translateX(" + (on.offsetLeft - 5) + "px)";
    sw.classList.toggle("after", after);
    card.classList.toggle("flipped", after);
  }
  if (sw) {
    $$("button", sw).forEach(function (b, i) { b.addEventListener("click", function () { setBA(i === 1); play(i ? "success" : "flip"); }); });
    card.addEventListener("click", function () { var a = !card.classList.contains("flipped"); setBA(a); play(a ? "success" : "flip"); });
    setBA(false); addEventListener("resize", function () { setBA(card.classList.contains("flipped")); });
  }

  /* ---------- Гортання прикладу в телефоні ---------- */
  var frame = $("#exampleFrame"), hint = $("#scrollHint"), auto = $("#autoScroll"), autoT;
  function frameWin() { try { return frame.contentWindow; } catch (e) { return null; } }
  function hideHint() { if (hint) hint.classList.add("hide"); }
  if (frame) frame.addEventListener("load", function () {
    if (hint) hint.classList.remove("hide");
    var w = frameWin();
    try { w.addEventListener("scroll", hideHint, { passive: true }); w.document.addEventListener("touchstart", hideHint, { passive: true }); } catch (e) {}
  });
  if (auto) auto.addEventListener("click", function () {
    var w = frameWin(); if (!w) return;
    hideHint(); cancelAnimationFrame(autoT);
    var doc = w.document.documentElement, end = doc.scrollHeight - w.innerHeight, start = w.scrollY;
    if (start >= end - 5) { w.scrollTo({ top: 0, behavior: "smooth" }); return; }
    var t0 = null, dur = Math.max(4000, (end - start) * 2.2);
    (function step(t) {
      if (!t0) t0 = t;
      var k = Math.min(1, (t - t0) / dur);
      w.scrollTo(0, start + (end - start) * (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2));
      if (k < 1) autoT = requestAnimationFrame(step);
    })(performance.now());
  });
})();
