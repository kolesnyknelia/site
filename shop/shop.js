/* =========================================================
   «Тямко» — товари, кошик, оформлення замовлення
   ⚙️ Ціни міняються тут І в api/shop-order.php (сервер рахує суму сам)
   ========================================================= */
(function () {
  "use strict";

  var CONFIG = {
    orderEndpoint: "../api/shop-order.php",
    freeShipFrom: 1000,      // безкоштовна доставка від, грн
    prepayDiscount: 0.05,    // знижка за передоплату
    pixelId: ""              // Meta Pixel ID (порожньо — вимкнено)
  };

  // Відгуки: додавайте ТІЛЬКИ справжні. Поки список порожній, блок прихований.
  // Приклад: { name: "Олена, Львів", text: "Донька сидить з папкою по годині!" }
  var REVIEWS = [];

  // Фото: покладіть файл у shop/img/ і вкажіть img: "img/papka.webp" — замість емодзі з'явиться фото
  var PRODUCTS = [
    {
      id: "papka", name: "Велика розвивальна папка «Тямко»", emoji: "🦉", bg: "linear-gradient(160deg,#ffb38a,#ff7a59)",
      age: "2–5 років", hit: "Хіт", price: 990,
      short: "32 ламіновані сторінки, ≈220 деталей на липучках і маркер «пиши-стирай».",
      bullets: ["Кольори, форми, цифри 1–10, абетка", "Тварини, пори року, логіка, моторика", "Граємось місяцями: стирається і перечіпляється"],
      inside: [
        ["Кольори", "Розклади предмети за 10 кольорами, «Наряди Тямка», веселка"],
        ["Форми", "Знайди пару, склади будиночок з фігур"],
        ["Цифри 1–10", "Порахуй і приклей, гусениця, яблука на дереві, обведи цифри"],
        ["Абетка", "33 літери з картинками, обведи літери маркером"],
        ["Тварини", "Хто де живе, мама і дитинча, хто що їсть, тіні"],
        ["Пори року", "Одягни Тямка за погодою, що буває взимку й улітку"],
        ["Я і моє тіло", "Склади обличчя, частини тіла, гігієна"],
        ["Логіка", "Продовж ряд, що зайве, від меншого до більшого, половинки"],
        ["Моторика", "Лабіринти, доріжки, лінії (маркер)"],
        ["Професії й транспорт", "Кому що потрібно, хто де їздить і літає"],
        ["Годинник і тиждень", "Рухомі стрілки, тиждень Тямка"],
        ["Мої досягнення", "20 зірочок за виконані розділи"],
        ["У комплекті", "Папка A4 на кільцях, 2 пакети деталей, маркер, серветка, інструкція"]
      ]
    },
    {
      id: "den", name: "«Мій день і мої емоції»: магнітні картки", emoji: "🙂", bg: "linear-gradient(160deg,#8fe0c5,#49b493)",
      age: "2–6 років", price: 590,
      short: "Магнітний режим дня на холодильник + емоції Тямка. Ранки без сліз і суперечок.",
      bullets: ["40 карток режиму + 4 порожні під маркер", "12 емоцій і термометр настрою", "8 карток «Що мені допоможе заспокоїтися»"],
      inside: [
        ["Дошка «Мій день»", "Магнітна A4: Ранок / День / Вечір / Зроблено ✓"],
        ["Режим дня", "40 магнітних карток: вмитися, зуби, сніданок, садочок, сон, купання…"],
        ["Порожні картки", "4 шт. — впишіть свої справи маркером"],
        ["Емоції Тямка", "12 карток: радість, сум, злість, страх, образа, спокій, гордість…"],
        ["Термометр настрою", "«Як я зараз?» з рухомою стрілкою"],
        ["Що мені допоможе", "8 карток: обійми, подихати «як дракон», вода, тиша, намалювати злість"],
        ["Для батьків", "Буклет: як вводити розклад, як говорити про емоції, 5 ігор"]
      ]
    },
    {
      id: "nalipky", name: "Розмальовки наліпками за номерами", emoji: "🎨", bg: "linear-gradient(160deg,#ffe08a,#ffb03c)",
      age: "4–8 років", price: 249,
      short: "Клеїш пронумеровані наліпки — і з'являється яскрава картина. 8 картин у книзі.",
      bullets: ["25–60 наліпок на картину", "Готову картину можна повісити на стіну", "Українські теми"],
      variants: [
        { id: "tvaryny", name: "Тварини України", price: 249 },
        { id: "karpaty", name: "Карпати", price: 249 },
        { id: "svyata", name: "Наші свята", price: 249 },
        { id: "seriya", name: "Усі 3 книги", price: 649, old: 747 }
      ],
      inside: [
        ["Тварини України", "Лелека, їжак, лисиця, ведмідь, зубр, сова, білка, дельфін"],
        ["Карпати", "Говерла, вівчар, гуцульська хата, водоспад, трембіта, олень, Синевир"],
        ["Наші свята", "Миколай, Різдво, Новий рік, Великдень, Вишиванка, День Незалежності, День народження, Купала"],
        ["Формат", "A4, 8 картин + 8 аркушів наліпок, перфорація для відривання"]
      ]
    },
    {
      id: "mistechko", name: "«Паперове містечко»: вирізалки", emoji: "✂️", bg: "linear-gradient(160deg,#c6b3ff,#8f6bff)",
      age: "4–8 років", price: 249,
      short: "Вирізаємо, клеїмо, граємося: будиночок, ляльки у вишиванках, тварини, сквіші.",
      bullets: ["16 аркушів щільного паперу", "Ляльки в українському вбранні", "Паперові сквіші з TikTok"],
      inside: [
        ["Будиночок Тямка", "Розгортка-книжка: кухня, спальня, ванна, садок + 30 меблів"],
        ["Ляльки", "4 ляльки + 24 вбрання: вишиванки регіонів, віночок, кептар, професії"],
        ["Ферма", "10 тварин, які стоять самі, + паркан"],
        ["Паперові сквіші", "Пончик, кіт, хмаринка, вареник"],
        ["Маски й корони", "Лисичка, зайчик, ведмідь, Тямко + 2 корони"],
        ["Містечко", "Магазин, школа, пошта, машинки, дорога"]
      ]
    },
    {
      id: "znaydy", name: "«Знайди і покажи з Тямком»", emoji: "🔍", bg: "linear-gradient(160deg,#9cc7ff,#6a8cff)",
      age: "3–7 років", price: 299,
      short: "12 великих картин, на кожній сховався Тямко і ще 15 предметів. 20–30 хвилин уваги.",
      bullets: ["Ідеально в дорогу, у черги, до лікаря", "Розвиває увагу, мовлення, рахунок", "Наліпки-медалі «Супер-шукач»"],
      inside: [
        ["12 розворотів", "Ранок удома, садочок, ринок, зоопарк, ліс, Карпати взимку, море, вокзал, ферма, Миколай, підводний світ, космос"],
        ["На кожному", "Знайди Тямка + 15 предметів + бонус «порахуй усіх котиків»"],
        ["Формат", "A4, 28 сторінок, щільна обкладинка, відповіді в кінці"]
      ]
    }
  ];

  var BUNDLES = [
    {
      id: "vse", name: "Все разом", best: true, price: 2190, old: 2777,
      items: ["Велика розвивальна папка", "Мій день і емоції", "Наліпки за номерами (3 книги)", "Паперове містечко", "Знайди і покажи"],
      note: "Розвиток на пів року вперед"
    },
    {
      id: "zyma", name: "Зимовий подарунок", price: 1149, old: 1387,
      items: ["Мій день і емоції", "Наліпки «Наші свята»", "Паперове містечко", "Знайди і покажи"],
      note: "До Миколая і Нового року"
    },
    {
      id: "pershyi", name: "Перший набір", price: 649, old: 797,
      items: ["Наліпки за номерами (1 книга на вибір у коментарі)", "Паперове містечко", "Знайди і покажи"],
      note: "Спробувати Тямка"
    }
  ];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = function (n) { return Math.round(n).toLocaleString("uk-UA").replace(/,/g, " ") + " грн"; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };

  /* ---------- Каталог ---------- */
  function catalog() {
    var map = {};
    PRODUCTS.forEach(function (p) {
      if (p.variants) p.variants.forEach(function (v) { map[p.id + ":" + v.id] = { name: p.name.replace(/^«|»$/g, "") + " — " + v.name, price: v.price }; });
      else map[p.id] = { name: p.name, price: p.price };
    });
    BUNDLES.forEach(function (b) { map["b:" + b.id] = { name: "Комплект «" + b.name + "»", price: b.price }; });
    return map;
  }
  var CAT = catalog();

  function renderProducts() {
    $("#products").innerHTML = PRODUCTS.map(function (p) {
      var art = p.img ? '<img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy">' : p.emoji;
      var variants = p.variants ? '<div class="variants" data-variants="' + p.id + '">' + p.variants.map(function (v, i) {
        return '<button type="button" class="' + (i === 0 ? "on" : "") + '" data-v="' + v.id + '">' + esc(v.name) + "</button>";
      }).join("") + "</div>" : "";
      return '<article class="prod" id="p-' + p.id + '">' +
        '<div class="art" style="background:' + p.bg + '">' + art +
          '<span class="age-tag">' + p.age + "</span>" + (p.hit ? '<span class="hit">' + p.hit + "</span>" : "") + "</div>" +
        '<div class="body"><h3>' + esc(p.name) + "</h3><p>" + esc(p.short) + "</p>" +
          "<ul>" + p.bullets.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>" +
          '<button class="link" data-info="' + p.id + '">Що всередині →</button>' + variants +
          '<div class="row"><span class="price" data-price="' + p.id + '"></span>' +
          '<button class="btn small" data-add="' + p.id + '">У кошик</button></div></div></article>';
    }).join("");
    PRODUCTS.forEach(updatePrice);
  }

  function currentKey(id) {
    var p = PRODUCTS.filter(function (x) { return x.id === id; })[0];
    if (!p.variants) return id;
    var on = $('[data-variants="' + id + '"] .on');
    return id + ":" + (on ? on.dataset.v : p.variants[0].id);
  }

  function updatePrice(p) {
    var v = p.variants ? p.variants.filter(function (x) { return currentKey(p.id) === p.id + ":" + x.id; })[0] : p;
    $('[data-price="' + p.id + '"]').innerHTML = fmt(v.price) + (v.old ? "<s>" + fmt(v.old) + "</s>" : "");
  }

  function renderBundles() {
    $("#bundleList").innerHTML = BUNDLES.map(function (b) {
      return '<div class="bundle' + (b.best ? " best" : "") + '"><h3>' + esc(b.name) + "</h3>" +
        '<p class="muted" style="margin:0">' + esc(b.note) + "</p>" +
        "<ul>" + b.items.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>" +
        '<div class="price">' + fmt(b.price) + "<s>" + fmt(b.old) + "</s></div>" +
        '<div class="save">Економія ' + fmt(b.old - b.price) + "</div>" +
        '<button class="btn" data-add-bundle="' + b.id + '">Замовити комплект</button></div>';
    }).join("");
  }

  function renderReviews() {
    if (!REVIEWS.length) return;
    $("#reviews").innerHTML = REVIEWS.map(function (r) {
      return '<div class="card"><p>«' + esc(r.text) + '»</p><b>' + esc(r.name) + "</b></div>";
    }).join("");
    $("#reviewsBlock").hidden = false;
  }

  /* ---------- Кошик ---------- */
  var cart = {};
  try { cart = JSON.parse(localStorage.getItem("tyamko_cart") || "{}") || {}; } catch (e) { cart = {}; }
  Object.keys(cart).forEach(function (k) { if (!CAT[k] || !(cart[k] > 0)) delete cart[k]; });

  function save() { try { localStorage.setItem("tyamko_cart", JSON.stringify(cart)); } catch (e) {} }

  function add(key) {
    $("#thanks").hidden = true; $(".sum").hidden = false;   // нове замовлення після вже оформленого
    cart[key] = (cart[key] || 0) + 1; save(); renderCart();
    track("AddToCart", { value: CAT[key].price, currency: "UAH", content_name: CAT[key].name });
    openModal("#cartModal");
  }

  function totals() {
    var items = 0, count = 0;
    Object.keys(cart).forEach(function (k) { items += CAT[k].price * cart[k]; count += cart[k]; });
    var prepay = ($("#orderForm input[name=pay]:checked") || {}).value === "prepay";
    var disc = prepay ? Math.round(items * CONFIG.prepayDiscount) : 0;
    return { items: items, count: count, disc: disc, total: items - disc, free: items >= CONFIG.freeShipFrom };
  }

  function renderCart() {
    var keys = Object.keys(cart);
    $("#cartList").innerHTML = keys.length ? keys.map(function (k) {
      return '<div class="line"><span class="nm">' + esc(CAT[k].name) + "</span>" +
        '<span class="qty"><button type="button" data-dec="' + k + '">−</button><b>' + cart[k] + '</b><button type="button" data-inc="' + k + '">+</button></span>' +
        '<span class="pr">' + fmt(CAT[k].price * cart[k]) + "</span></div>";
    }).join("") : '<p class="empty">Кошик порожній. Оберіть набір 👇</p>';
    var t = totals();
    $("#cartCount").textContent = t.count;
    $("#stickyTotal").textContent = fmt(t.total);
    $("#sumItems").textContent = fmt(t.items);
    $("#rowDisc").hidden = !t.disc;
    $("#sumDisc").textContent = "−" + fmt(t.disc);
    $("#sumShip").textContent = t.free ? "безкоштовно 🎁" : "за тарифом НП (безкоштовно від " + fmt(CONFIG.freeShipFrom) + ")";
    $("#sumTotal").textContent = fmt(t.total);
    $("#orderForm").hidden = !keys.length || !$("#thanks").hidden;
  }

  /* ---------- Модальні вікна ---------- */
  function openModal(sel) { $(sel).hidden = false; document.body.style.overflow = "hidden"; }
  function closeModals() { $$(".modal").forEach(function (m) { m.hidden = true; }); document.body.style.overflow = ""; }

  function showInfo(id) {
    var p = PRODUCTS.filter(function (x) { return x.id === id; })[0];
    $("#infoBody").innerHTML = "<h3>" + p.emoji + " " + esc(p.name) + "</h3><p class='muted'>" + esc(p.short) + "</p>" +
      "<table>" + p.inside.map(function (r) { return "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1]) + "</td></tr>"; }).join("") + "</table>" +
      '<button class="btn full" data-add="' + p.id + '">У кошик · ' + fmt(CAT[currentKey(p.id)].price) + "</button>";
    openModal("#infoModal");
    track("ViewContent", { content_name: p.name });
  }

  /* ---------- Події ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("button, [data-open-cart]");
    if (!t) { if (e.target.classList.contains("modal")) closeModals(); return; }
    if (t.dataset.add) { closeModals(); add(currentKey(t.dataset.add)); }
    else if (t.dataset.addBundle) add("b:" + t.dataset.addBundle);
    else if (t.dataset.info) showInfo(t.dataset.info);
    else if (t.dataset.inc) { cart[t.dataset.inc]++; save(); renderCart(); }
    else if (t.dataset.dec) { if (--cart[t.dataset.dec] <= 0) delete cart[t.dataset.dec]; save(); renderCart(); }
    else if (t.dataset.v) {
      $$("button", t.parentNode).forEach(function (b) { b.classList.toggle("on", b === t); });
      updatePrice(PRODUCTS.filter(function (x) { return x.id === t.parentNode.dataset.variants; })[0]);
    }
    else if (t.hasAttribute("data-close")) closeModals();
    else if (t.hasAttribute("data-open-cart")) { renderCart(); openModal("#cartModal"); track("InitiateCheckout", { value: totals().total, currency: "UAH" }); }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModals(); });
  document.addEventListener("change", function (e) { if (e.target.name === "pay") renderCart(); });

  // Липка кнопка з'являється після першого екрана
  var sticky = $(".sticky");
  window.addEventListener("scroll", function () { sticky.classList.toggle("show", window.scrollY > 500); }, { passive: true });

  /* ---------- UTM ---------- */
  var utm = {};
  try { utm = JSON.parse(sessionStorage.getItem("tyamko_utm") || "{}") || {}; } catch (e) {}
  new URLSearchParams(location.search).forEach(function (v, k) { if (/^utm_|^fbclid$/.test(k)) utm[k] = v.slice(0, 120); });
  try { sessionStorage.setItem("tyamko_utm", JSON.stringify(utm)); } catch (e) {}

  /* ---------- Оформлення ---------- */
  $("#orderForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, ok = true;
    ["name", "phone", "city", "np"].forEach(function (n) {
      var el = f.elements[n], v = el.value.trim();
      var bad = n === "phone" ? v.replace(/\D/g, "").length < 10 : v.length < 2;
      el.classList.toggle("err", bad); if (bad) ok = false;
    });
    if (!ok || !Object.keys(cart).length) return;
    var btn = f.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Надсилаємо…";
    var data = new FormData(f);
    data.append("cart", JSON.stringify(cart));
    data.append("utm", JSON.stringify(utm));
    var t = totals();
    fetch(CONFIG.orderEndpoint, { method: "POST", body: data })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.error || "error");
        track("Purchase", { value: res.total || t.total, currency: "UAH" });
        $("#orderRef").textContent = res.ref;
        cart = {}; save();
        $("#thanks").hidden = false; renderCart();
        $("#cartList").innerHTML = ""; $(".sum").hidden = true;
      })
      .catch(function () {
        alert("Не вдалося надіслати замовлення. Спробуйте ще раз або напишіть нам у Telegram @hellppbott.");
        btn.disabled = false; btn.textContent = "Оформити замовлення";
      });
  });

  /* ---------- Meta Pixel ---------- */
  function track(ev, params) { if (window.fbq) window.fbq("track", ev, params || {}); }
  if (CONFIG.pixelId) {
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", CONFIG.pixelId); window.fbq("track", "PageView");
  }

  renderProducts(); renderBundles(); renderReviews(); renderCart();
})();
