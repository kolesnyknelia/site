/* Логіка сайту: ціни з config.js, галерея, таймер, форма заявки, Meta Pixel.
   Тут нічого міняти не треба: товар і ціни — у js/config.js */
(function () {
  var S = window.SITE || {};
  var price = +S.price || 0, old = +S.oldPrice || price, d2 = Math.max(0, +S.discount2 || 0);
  var sum = function (q) { return q >= 2 ? q * price - d2 : price; };

  /* ---------- Ціни на сторінці ---------- */
  var set = function (attr, val) { document.querySelectorAll("[" + attr + "]").forEach(function (el) { el.textContent = val; }); };
  set("data-price", price);
  set("data-old", old);
  set("data-save", old - price);
  set("data-percent", old > price ? "-" + Math.round((old - price) / old * 100) + "%" : "Хіт");
  set("data-sum2", sum(2));
  set("data-old2", old * 2);
  set("data-discount2", d2);
  if (S.shop) set("data-shop", S.shop);
  var y = document.getElementById("year"); if (y) y.textContent = new Date().getFullYear();
  var upP = Math.max(0, +S.upsellPrice || 0);
  if (upP && S.upsellName) { set("data-upsell-price", upP); set("data-upsell-name", S.upsellName); }
  else { ["upsell", "upsellCard"].forEach(function (id) { var el = document.getElementById(id); if (el) el.remove(); }); }
  if (!d2) {
    var deal = document.getElementById("deal2"); if (deal) deal.hidden = true;
    var tag = document.querySelector("#qty2 .qty-tag"); if (tag) tag.remove();
  }

  /* ---------- Meta Pixel ---------- */
  var px = String(S.pixelId || "").replace(/\D/g, "");
  if (px) {
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", px); fbq("track", "PageView");
  }
  var track = function (ev, data) { if (window.fbq) fbq("track", ev, data); };

  /* ---------- UTM з реклами (передаємо в заявку) ---------- */
  var utm = {};
  try { utm = JSON.parse(sessionStorage.getItem("utm") || "{}"); } catch (e) {}
  new URLSearchParams(location.search).forEach(function (v, k) { if (/^utm_|^fbclid$/.test(k)) utm[k] = v.slice(0, 120); });
  try { sessionStorage.setItem("utm", JSON.stringify(utm)); } catch (e) {}

  /* ---------- Галерея ---------- */
  var slides = document.getElementById("slides"), dots = document.getElementById("dots");
  if (slides && dots) {
    var imgs = slides.querySelectorAll("img");
    if (imgs.length > 1) {
      imgs.forEach(function (_, i) {
        var b = document.createElement("button");
        b.type = "button"; b.setAttribute("aria-label", "Фото " + (i + 1));
        b.onclick = function () { slides.scrollTo({ left: i * slides.clientWidth, behavior: "smooth" }); };
        dots.appendChild(b);
      });
      var mark = function () {
        var i = Math.round(slides.scrollLeft / Math.max(1, slides.clientWidth));
        dots.querySelectorAll("button").forEach(function (b, j) { b.classList.toggle("on", i === j); });
      };
      slides.addEventListener("scroll", function () { requestAnimationFrame(mark); }, { passive: true });
      mark();
    }
  }

  /* ---------- Таймер до кінця доби ---------- */
  var pad = function (n) { return String(n).padStart(2, "0"); };
  var timer = document.getElementById("timer"), inl = document.querySelectorAll(".js-timer-inline");
  (function tick() {
    var now = new Date(), end = new Date(now); end.setHours(24, 0, 0, 0);
    var s = Math.max(0, Math.floor((end - now) / 1000)), p = [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(pad);
    if (timer) timer.querySelectorAll("b").forEach(function (b, i) { b.textContent = p[i]; });
    inl.forEach(function (el) { el.textContent = p.join(":"); });
    setTimeout(tick, 1000);
  })();

  /* ---------- Кнопка «Хочу 2 шт» і нижня кнопка ---------- */
  document.querySelectorAll("[data-pick]").forEach(function (a) {
    a.addEventListener("click", function () {
      var r = document.querySelector('input[name="qty"][value="' + a.getAttribute("data-pick") + '"]');
      if (r) { r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); }
    });
  });
  document.querySelectorAll("[data-check]").forEach(function (a) {
    a.addEventListener("click", function () {
      var c = document.querySelector('input[name="' + a.getAttribute("data-check") + '"]');
      if (c && !c.checked) { c.checked = true; c.dispatchEvent(new Event("change", { bubbles: true })); }
    });
  });
  var sticky = document.getElementById("sticky"), order = document.getElementById("order");
  if (sticky && order) {
    var onScroll = function () {
      var r = order.getBoundingClientRect();
      sticky.classList.toggle("show", scrollY > 500 && (r.top > innerHeight || r.bottom < 0));
    };
    addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  /* ---------- Форма заявки ---------- */
  var form = document.getElementById("orderForm");
  if (!form) return;
  var totalEl = document.getElementById("total"), err = document.getElementById("formErr"), btn = document.getElementById("submitBtn");
  var qty = function () { var r = form.querySelector('input[name="qty"]:checked'); return r ? +r.value : 1; };
  var withUp = function () { var c = form.elements.upsell; return !!(c && c.checked); };
  var total = function () { return sum(qty()) + (withUp() ? upP : 0); };
  var upd = function () { totalEl.textContent = total(); };
  form.addEventListener("change", upd); upd();

  var phoneInput = form.elements.phone;
  phoneInput.addEventListener("focus", function () { if (!phoneInput.value) phoneInput.value = "+380"; });
  var normPhone = function (v) {
    var d = String(v).replace(/\D/g, "");
    if (d.length === 10 && d[0] === "0") d = "38" + d;
    if (d.length === 9) d = "380" + d;
    return d;
  };

  var started = false;
  form.addEventListener("focusin", function () {
    if (started) return; started = true;
    track("InitiateCheckout", { value: total(), currency: "UAH", content_name: S.product });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    err.textContent = "";
    var name = form.elements.name.value.trim(), phone = normPhone(phoneInput.value), bad = false;
    form.elements.name.classList.toggle("bad", name.length < 2);
    var phoneOk = /^380\d{9}$/.test(phone) || (phone.length >= 10 && phone.length <= 15 && !/^380/.test(phone));
    phoneInput.classList.toggle("bad", !phoneOk);
    if (name.length < 2) { err.textContent = "Вкажіть, будь ласка, ім'я"; bad = true; }
    else if (!phoneOk) { err.textContent = "Перевірте номер телефону: +380 і ще 9 цифр"; bad = true; }
    if (bad) return;

    btn.disabled = true; btn.textContent = "Надсилаємо…";
    var q = qty();
    fetch(S.endpoint || "api/order.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, phone: "+" + phone, qty: q, upsell: withUp() ? 1 : 0, utm: utm, website: form.elements.website.value })
    })
      .then(function (r) { return r.json().catch(function () { return {}; }); })
      .then(function (r) {
        if (!r || !r.ok) throw new Error(r && r.error || "fail");
        location.href = "thanks.html?ref=" + encodeURIComponent(r.ref) + "&sum=" + r.total + "&qty=" + q + (withUp() ? "&up=1" : "");
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = "Оформити замовлення";
        err.textContent = "Не вдалося надіслати заявку. Перевірте інтернет і спробуйте ще раз.";
      });
  });
})();
