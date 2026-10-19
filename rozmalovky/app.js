/* =========================================================
   «Розмалюй момент» — каталог, гортання сторінок, кошик, замовлення
   Дані (ціни, розмальовки) — у products.js
   ========================================================= */
(function () {
  "use strict";

  var CONFIG = RM.CONFIG, REVIEWS = RM.REVIEWS, VARIANTS = RM.VARIANTS, PRODUCTS = RM.PRODUCTS;

  var VISIBLE = PRODUCTS.filter(function (p) { return !p.hidden; });

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var fmt = function (n) { return Math.round(n).toLocaleString("uk-UA").replace(/,/g, " ") + " грн"; };
  var img = function (n) { return "img/" + n + ".webp"; };
  var byId = function (id) { return PRODUCTS.filter(function (p) { return p.id === id; })[0]; };

  var tierPrice = RM.tierPrice, P1 = { classic: tierPrice("classic", 1), premium: tierPrice("premium", 1) };
  var galleryOf = function (p, v) { return v === "premium" && p.imgsPremium ? p.imgsPremium : p.imgs; };

  /* ---------- Ціни за кількістю (для обох варіантів) ---------- */
  function renderTiers() {
    $("#tierGrid").innerHTML = [1, 2, 3].map(function (n) {
      var c = tierPrice("classic", n), pr = tierPrice("premium", n);
      return '<div class="tier' + (n === 3 ? " best" : "") + '"><div class="n">' + n + '</div><div class="w">' + (n === 1 ? "розмальовка" : "розмальовки") + "</div>" +
        '<div class="vrow"><small>Класична</small><div class="p">' + fmt(c) + "</div>" + (n > 1 ? '<span class="eco">−' + fmt(n * P1.classic - c) + "</span>" : "") + "</div>" +
        '<div class="vrow prem"><small>Преміум</small><div class="p">' + fmt(pr) + "</div>" + (n > 1 ? '<span class="eco">−' + fmt(n * P1.premium - pr) + "</span>" : "") + "</div></div>";
    }).join("");
  }

  /* ---------- Каталог ---------- */
  function renderGrid() {
    $("#grid").classList.toggle("one", VISIBLE.length === 1);
    $("#grid").innerHTML = VISIBLE.map(function (p, i) {
      var cover = p.imgs[0].indexOf("mockup") > -1 && p.imgs[1] ? p.imgs[1] : p.imgs[0];
      return '<article class="card c' + (i % 6) + '" data-open="' + p.id + '">' +
        '<div class="cover"><img src="' + img(cover) + '" alt="' + esc(p.name) + '" loading="lazy">' +
        (p.tag ? '<span class="tag">' + esc(p.tag) + "</span>" : "") + '<span class="pages">20 картин</span></div>' +
        '<div class="body"><h3>' + esc(p.name) + '</h3><div class="row"><span class="price"><small>від</small> ' + fmt(P1.classic) + "</span>" +
        '<button class="add" data-quick="' + p.id + '">+ У кошик</button></div></div></article>';
    }).join("");
    markInCart();
  }
  function markInCart() {
    $$(".card .add").forEach(function (b) {
      var n = countOf(b.dataset.quick);
      b.classList.toggle("in", n > 0); b.textContent = n ? "✓ У кошику" + (n > 1 ? " ×" + n : "") : "+ У кошик";
    });
  }

  /* Стрічка «Погляньте всередину»: сторінки з усіх розмальовок (класичні й преміальні), до 12 штук */
  function renderStrip() {
    var el = $("#strip"); if (!el) return;
    var out = [], rounds = 0;
    while (out.length < 12 && rounds < 10) {
      VISIBLE.forEach(function (p) {
        var list = p.imgs.filter(function (n) { return !/cover|mockup/.test(n); }).concat(p.imgsPremium || []);
        if (list[rounds]) out.push({ id: p.id, n: list[rounds], v: (p.imgsPremium || []).indexOf(list[rounds]) > -1 ? "premium" : "classic" });
      });
      rounds++;
    }
    el.innerHTML = out.slice(0, 12).map(function (x) { return '<img src="' + img(x.n) + '" alt="" data-open="' + x.id + '" data-v="' + x.v + '">'; }).join("");
  }

  /* ---------- Розмальовка: гортання ---------- */
  var current = null, currentVar = "classic";
  function galleryHtml(p, v) {
    var list = galleryOf(p, v);
    return '<div class="gallery" id="gal">' + list.map(function (n, i) { return '<img src="' + img(n) + '" alt="' + esc(p.name) + " — " + vname(v) + ", сторінка " + (i + 1) + '">'; }).join("") + "</div>" +
      '<div class="dots" id="dots">' + list.map(function (n, i) { return '<i class="' + (i ? "" : "on") + '"></i>'; }).join("") + "</div>";
  }
  function bindGallery() {
    var gal = $("#gal");
    gal.addEventListener("scroll", function () {
      var i = Math.round(gal.scrollLeft / (gal.firstChild.offsetWidth + 10));
      $$("#dots i").forEach(function (d, k) { d.classList.toggle("on", k === i); });
    }, { passive: true });
  }
  /** Перемикання варіанту у вікні розмальовки: інші фото й ціна */
  function showVariant(v) {
    currentVar = v;
    $$(".vpick button").forEach(function (b) { b.classList.toggle("on", b.dataset.var === v); });
    $("#galWrap").innerHTML = galleryHtml(current, v); bindGallery();
    $("#pprice").textContent = fmt(P1[v]);
  }
  function openProduct(id, v) {
    var p = byId(id); current = p; currentVar = v || "classic";
    $("#prodBody").innerHTML =
      '<div id="galWrap">' + galleryHtml(p, currentVar) + "</div>" +
      "<h3>" + esc(p.name) + '</h3><p class="pdesc">' + esc(p.desc) + "</p>" +
      '<ul class="pfacts"><li>20 картин</li><li>A4</li><li>Металева пружина</li><li>Відправка в день замовлення</li></ul>' +
      '<div class="vpick">' + VARIANTS.map(function (v) { return '<button type="button" data-var="' + v.id + '" class="' + (v.id === currentVar ? "on" : "") + '"><b>' + v.name + " · " + fmt(P1[v.id]) + "</b>" + v.hint + "</button>"; }).join("") + "</div>" +
      '<div class="pbuy"><span class="price" id="pprice">' + fmt(P1[currentVar]) + '</span><button class="btn" data-add-current>Додати в кошик</button></div>';
    openModal("#prodModal");
    bindGallery();
    track("ViewContent", { content_name: p.name });
  }

  /* ---------- Кошик (спільний для іконки, панелі й блоку замовлення) ---------- */
  var cart = {};
  try { cart = JSON.parse(localStorage.getItem("rm_cart") || "{}") || {}; } catch (e) { cart = {}; }
  Object.keys(cart).forEach(function (k) { var p = byId(k.split(":")[0]), v = k.split(":")[1]; if (!p || p.hidden || !/^(classic|premium)$/.test(v) || !(cart[k] > 0)) delete cart[k]; });
  function save() { try { localStorage.setItem("rm_cart", JSON.stringify(cart)); } catch (e) {} }
  function count() { return Object.keys(cart).reduce(function (s, k) { return s + cart[k]; }, 0); }
  function counts(extraVar) {
    var c = { classic: 0, premium: 0 };
    Object.keys(cart).forEach(function (k) { c[k.split(":")[1]] += cart[k]; });
    if (extraVar) c[extraVar]++;
    return c;
  }
  function cartTotal(extraVar) { return RM.total(counts(extraVar)); }
  function fullPrice() { var c = counts(); return c.classic * P1.classic + c.premium * P1.premium; }
  function countOf(id) { return Object.keys(cart).reduce(function (s, k) { return s + (k.split(":")[0] === id ? cart[k] : 0); }, 0); }
  function coverOf(p, v) { if (v === "premium" && p.imgsPremium) return p.imgsPremium[0]; return p.imgs[0].indexOf("mockup") > -1 && p.imgs[1] ? p.imgs[1] : p.imgs[0]; }
  function vname(id) { return VARIANTS.filter(function (x) { return x.id === id; })[0].name; }

  function add(id, variant) {
    var key = id + ":" + (variant || "classic");
    cart[key] = (cart[key] || 0) + 1; save(); renderAll();
    track("AddToCart", { value: P1[variant || "classic"], currency: "UAH", content_name: byId(id).name });
  }
  function setQty(key, q) { if (q <= 0) delete cart[key]; else cart[key] = q; save(); renderAll(); }
  function switchVariant(key, v) {
    var id = key.split(":")[0], to = id + ":" + v; if (to === key) return;
    var q = cart[key] || 0; delete cart[key]; if (q) cart[to] = (cart[to] || 0) + q;
    save(); renderAll(to);
  }

  function hintText(n) {
    if (!n) return "";
    var c = counts(), v = c.premium > c.classic ? "premium" : "classic", more = cartTotal(v) - cartTotal();
    if (n < 3) return "🎁 Додайте ще одну розмальовку (" + vname(v).toLowerCase() + ") всього за <b>" + fmt(more) + "</b>" + (n === 2 ? " — 3 шт. найвигідніше!" : "");
    return "🔥 Максимальна знижка! Кожна наступна — лише <b>" + fmt(CONFIG.extra.classic) + "</b> (класична) або <b>" + fmt(CONFIG.extra.premium) + "</b> (преміум)";
  }
  function fillSum(prefix, n) {
    var total = cartTotal(), full = fullPrice();
    $("#" + prefix + "Full").textContent = fmt(full);
    $("#" + prefix + "Save").textContent = "−" + fmt(full - total);
    $("#" + prefix + "Total").textContent = fmt(total);
    $("#" + prefix + "Save").parentNode.hidden = full === total; $("#" + prefix + "Full").parentNode.hidden = full === total;
  }

  /* Кошик у вікні */
  function renderCart() {
    var keys = Object.keys(cart).filter(function (k) { return cart[k] > 0; }), n = count();
    $("#cartList").innerHTML = keys.length ? keys.map(function (k) {
      var p = byId(k.split(":")[0]);
      return '<div class="line"><img src="' + img(coverOf(p, k.split(":")[1])) + '" alt=""><span class="nm">' + esc(p.name) + "<small>" + vname(k.split(":")[1]) + "</small></span>" +
        '<span class="qty"><button type="button" data-dec="' + k + '">−</button><b>' + cart[k] + '</b><button type="button" data-inc="' + k + '">+</button></span></div>';
    }).join("") : '<p class="empty">Кошик порожній — оберіть розмальовки 👇</p>';
    $("#cartHint").innerHTML = hintText(n);
    fillSum("sum", n);
    $("#sumBox").hidden = !n;
    $("[data-go-order]").hidden = !n;
  }

  /* Блок замовлення внизу: усі розмальовки зі степперами */
  var touched = {};   // рядки з кількістю 0, які лишаємо на обраному варіанті
  function renderPicks(focusKey) {
    $("#picks").innerHTML = VISIBLE.map(function (p) {
      var keys = VARIANTS.map(function (v) { return p.id + ":" + v.id; }).filter(function (k) { return cart[k] > 0 || k === focusKey || touched[k]; });
      if (!keys.length) keys = [p.id + ":classic"];
      return keys.map(function (k) {
        var q = cart[k] || 0, v = k.split(":")[1];
        return '<div class="pick' + (q ? " on" : "") + '"><img src="' + img(coverOf(p, v)) + '" alt="" data-open="' + p.id + '" data-v="' + v + '">' +
          '<div class="pinfo"><b>' + esc(p.name) + '</b><div class="pv">' + VARIANTS.map(function (x) {
            return '<button type="button" data-sw="' + k + '" data-to="' + x.id + '" class="' + (x.id === v ? "on" : "") + '">' + x.name + " · " + fmt(P1[x.id]) + "</button>"; }).join("") + "</div></div>" +
          '<div class="qty"><button type="button" data-dec="' + k + '">−</button><b>' + q + '</b><button type="button" data-inc="' + k + '">+</button></div></div>';
      }).join("");
    }).join("");
  }
  function renderOrder(focusKey) {
    var n = count();
    renderPicks(focusKey);
    $("#tierGrid2").innerHTML = $("#tierGrid").innerHTML;
    $$("#tierGrid2 .tier").forEach(function (t, i) { t.classList.toggle("cur", n >= i + 1 && (n < i + 2 || i === 2)); });
    $("#orderHint").innerHTML = hintText(n);
    $("#oCount").textContent = n + " шт.";
    fillSum("o", n);
    $("#submitBtn").textContent = n ? "Замовити за " + fmt(cartTotal()) : "Замовити";
  }

  function renderAll(focusKey) {
    var n = count(), total = cartTotal();
    $("#cartCount").textContent = n;
    $("#cartbar").hidden = !n || orderVisible;
    $("#cartbarText").textContent = "🛒 У кошику " + n + " шт.";
    $("#cartbarTotal").textContent = fmt(total) + " →";
    markInCart(); renderCart(); renderOrder(focusKey);
  }

  // Липка панель не потрібна, коли блок замовлення вже на екрані
  var orderVisible = false;
  if ("IntersectionObserver" in window) new IntersectionObserver(function (en) {
    orderVisible = en[0].isIntersecting; $("#cartbar").hidden = !count() || orderVisible;
  }, { rootMargin: "0px 0px -30% 0px" }).observe($("#order"));

  /* ---------- Модальні вікна ---------- */
  function openModal(sel) { $(sel).hidden = false; document.body.style.overflow = "hidden"; }
  function closeModals() { $$(".modal").forEach(function (m) { m.hidden = true; }); document.body.style.overflow = ""; }
  function goOrder() { closeModals(); $("#order").scrollIntoView({ behavior: "smooth" }); track("InitiateCheckout", { value: cartTotal(), currency: "UAH" }); }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("button, [data-open], [data-open-cart], a[href='#order']");
    if (!t) { if (e.target.classList.contains("modal")) closeModals(); return; }
    if (t.dataset.quick) { e.stopPropagation(); add(t.dataset.quick, "classic"); return; }
    if (t.dataset.open) return openProduct(t.dataset.open, t.dataset.v);
    if (t.dataset.var) return showVariant(t.dataset.var);
    if (t.hasAttribute("data-add-current")) { add(current.id, currentVar); closeModals(); openModal("#cartModal"); return; }
    if (t.dataset.sw) { touched[t.dataset.sw.split(":")[0] + ":" + t.dataset.to] = true; delete touched[t.dataset.sw]; return switchVariant(t.dataset.sw, t.dataset.to); }
    if (t.dataset.inc) { touched[t.dataset.inc] = true; return setQty(t.dataset.inc, (cart[t.dataset.inc] || 0) + 1); }
    if (t.dataset.dec) { return setQty(t.dataset.dec, (cart[t.dataset.dec] || 0) - 1); }
    if (t.hasAttribute("data-go-order")) return goOrder();
    if (t.hasAttribute("data-close")) return closeModals();
    if (t.hasAttribute("data-open-cart")) { if (t.id === "cartbar") return goOrder(); renderCart(); openModal("#cartModal"); return; }
    if (t.matches("a[href='#order']")) { track("InitiateCheckout", { value: cartTotal(), currency: "UAH" }); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModals(); });

  /* ---------- UTM ---------- */
  var utm = {};
  try { utm = JSON.parse(sessionStorage.getItem("rm_utm") || "{}") || {}; } catch (e) {}
  new URLSearchParams(location.search).forEach(function (v, k) { if (/^utm_|^fbclid$/.test(k)) utm[k] = v.slice(0, 120); });
  try { sessionStorage.setItem("rm_utm", JSON.stringify(utm)); } catch (e) {}

  /* ---------- Оформлення → сторінка подяки ---------- */
  $("#orderForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, ok = true, n = count();
    ["name", "telegram", "phone"].forEach(function (k) {
      var el = f.elements[k], v = el.value.trim();
      var bad = k === "phone" ? v.replace(/\D/g, "").length < 10 : v.length < (k === "name" ? 3 : 2);
      el.classList.toggle("err", bad); if (bad) ok = false;
    });
    $("#formErr").hidden = n > 0;
    if (!n) { $("#picks").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (!ok) { var first = f.querySelector(".err"); if (first) first.focus(); return; }
    var btn = $("#submitBtn"); btn.disabled = true; btn.textContent = "Надсилаємо…";
    var data = new FormData(f);
    var clean = {}; Object.keys(cart).forEach(function (k) { if (cart[k] > 0) clean[k] = cart[k]; });
    data.append("cart", JSON.stringify(clean));
    data.append("utm", JSON.stringify(utm));
    fetch(CONFIG.orderEndpoint, { method: "POST", body: data })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.error || "error");
        // Склад замовлення — для сторінки подяки (готовий текст повідомлення у Viber / Telegram)
        try {
          sessionStorage.setItem("rm_last_order", JSON.stringify({
            ref: res.ref, total: res.total, n: n,
            items: Object.keys(clean).map(function (k) { return { name: byId(k.split(":")[0]).name, variant: vname(k.split(":")[1]), qty: clean[k] }; }),
            name: f.elements.name.value.trim(), phone: f.elements.phone.value.trim(), telegram: f.elements.telegram.value.trim()
          }));
        } catch (e) {}
        cart = {}; save();
        location.href = "thanks.html?ref=" + encodeURIComponent(res.ref) + "&total=" + res.total + "&n=" + n + "&name=" + encodeURIComponent((function (p) { return p.length > 1 ? p[1] : p[0]; })(f.elements.name.value.trim().split(/\s+/)));
      })
      .catch(function () {
        alert("Не вдалося надіслати замовлення. Спробуйте ще раз або напишіть нам у Telegram @hellppbott.");
        btn.disabled = false; renderOrder();
      });
  });

  /* ---------- Відгуки ---------- */
  if (REVIEWS.length) {
    $("#reviews").innerHTML = REVIEWS.map(function (r) { return '<div class="rev"><p>«' + esc(r.text) + '»</p><b>' + esc(r.name) + "</b></div>"; }).join("");
    $("#reviewsBlock").hidden = false;
  }

  /* ---------- Meta Pixel ---------- */
  function track(ev, params) { if (window.fbq) window.fbq("track", ev, params || {}); }
  if (CONFIG.pixelId) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", CONFIG.pixelId); window.fbq("track", "PageView");
  }

  renderTiers(); renderGrid(); renderStrip(); renderAll();
})();
