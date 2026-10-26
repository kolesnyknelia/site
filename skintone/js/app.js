/* Демо-приклад: форма не надсилає заявок, а одразу веде на «Дякуємо». */
(function () {
  var $ = function (s) { return document.querySelector(s); };

  // Таймер до кінця доби
  var pad = function (n) { return String(n).padStart(2, "0"); };
  (function tick() {
    var now = new Date(), end = new Date(now); end.setHours(24, 0, 0, 0);
    var s = Math.floor((end - now) / 1000);
    document.querySelectorAll(".js-timer").forEach(function (el) {
      el.textContent = [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(pad).join(":");
    });
    setTimeout(tick, 1000);
  })();

  // Кольори світла
  var root = document.documentElement, dots = document.querySelectorAll(".dot");
  function pick(d) {
    dots.forEach(function (x) { x.setAttribute("aria-selected", x === d ? "true" : "false"); });
    var c = getComputedStyle(d).getPropertyValue("--c").trim();
    root.style.setProperty("--glow", c);
    $("#cName").textContent = d.dataset.t;
    $("#cDesc").textContent = d.dataset.d;
  }
  dots.forEach(function (d) { d.addEventListener("click", function () { pick(d); }); });
  if (dots[4]) pick(dots[4]);

  // Поява блоків
  var els = document.querySelectorAll(".card,.steps li,.gallery figure,.color-card,.specs-pic,.form,.faq details");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: .12 });
    els.forEach(function (el, i) { el.classList.add("rv"); el.style.transitionDelay = (i % 4) * 80 + "ms"; io.observe(el); });
  }

  // Липка кнопка
  var sticky = $("#sticky"), order = $("#order");
  addEventListener("scroll", function () {
    var r = order.getBoundingClientRect();
    sticky.classList.toggle("show", scrollY > 500 && (r.top > innerHeight || r.bottom < 0));
  }, { passive: true });

  // Форма
  var form = $("#orderForm"), err = $("#formErr"), PRICES = { 1: 350, 2: 650 };
  var qty = function () { return +form.querySelector('input[name="qty"]:checked').value; };
  form.addEventListener("change", function () { $("#total").textContent = PRICES[qty()]; });
  var phone = form.elements.phone;
  phone.addEventListener("focus", function () { if (!phone.value) phone.value = "+380"; });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = form.elements.name.value.trim(), digits = phone.value.replace(/\D/g, "");
    if (digits.length === 10 && digits[0] === "0") digits = "38" + digits;
    var okName = name.length >= 2, okPhone = /^380\d{9}$/.test(digits);
    form.elements.name.classList.toggle("bad", !okName);
    phone.classList.toggle("bad", !okPhone);
    if (!okName) { err.textContent = "Вкажіть, будь ласка, ім'я"; return; }
    if (!okPhone) { err.textContent = "Перевірте номер: +380 і ще 9 цифр"; return; }
    location.href = "thanks.html?sum=" + PRICES[qty()];
  });
})();
