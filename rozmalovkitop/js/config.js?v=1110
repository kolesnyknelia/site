/* ⚙️ НАЛАШТУВАННЯ САЙТУ (те, що бачить браузер).
   Секрети (токен бота, ключ LP-CRM) тут НЕ пишемо — вони лише в api/config.php.
   Ціни мають збігатися з api/config.php: сервер рахує суму сам. */
window.SITE = {
  accent: "#c9748f",             // 🎨 пудрово-рожеві кнопки
  shop: "Зима міленіалів",
  product: "Розмальовка «Зима міленіалів»",
  price: 290,                    // ✏️ ціна, грн (уточнити)
  oldPrice: 580,                 // ✏️ стара ціна, грн
  discount2: 0,
  pixelId: "28766641876329088", // ID пікселя Meta
  tiktokPixelId: "DAT7HHRC77UA02BT68MG",
  // Додатково до замовлення. Ціни мають збігатися з api/order.php (список $EXTRAS)
  extras: [
    { id: "markers", name: "Акрилові маркери, 24 кольори", price: 320 },
    { id: "pencils", name: "Кольорові олівці, 24 кольори", price: 140 },
    { id: "multyky", name: "Розмальовка «Мультики дитинства»", price: 249 },
    { id: "christmas", name: "Розмальовка «Merry Christmas»", price: 249 },
    { id: "selo", name: "Розмальовка «Зима в українському селі»", price: 249 },
    { id: "grinch", name: "Розмальовка «Грінч»", price: 249 },
    { id: "potter", name: "Розмальовка «Гаррі Поттер»", price: 249 },
    { id: "zhyttia", name: "Розмальовка «Розмальовка нашого життя»", price: 249 },
    { id: "dytynstvo", name: "Розмальовка «Назад у дитинство»", price: 249 },
    { id: "90", name: "Розмальовка «Назад у 90-ті»", price: 249 }
  ],
  endpoint: "api/order.php"
};

if (window.SITE.accent) document.documentElement.style.setProperty("--accent", window.SITE.accent);
