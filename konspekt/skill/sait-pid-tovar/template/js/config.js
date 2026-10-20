/* ⚙️ НАЛАШТУВАННЯ САЙТУ (те, що бачить браузер).
   Секрети (токен бота, ключ LP-CRM) тут НЕ пишемо — вони лише в api/config.php або api/_config.js.
   Ціни мають збігатися з api/config.php (хостинг) або api/_config.js (Vercel): сервер рахує суму сам. */
window.SITE = {
  shop: "Посуд",              // назва магазину
  product: "Назва товару",       // коротка назва товару (для пікселя й кнопок)
  price: 499,                    // ціна за 1 шт, грн
  oldPrice: 998,                // стара (закреслена) ціна за 1 шт, грн
  discount2: 0,                  // знижка на замовлення 2 шт, грн (0 — без знижки)
  pixelId: "",                   // ID Meta Pixel з Events Manager (лише цифри)
  endpoint: "api/order.php"      // хостинг Україна: "api/order.php" · Vercel: "/api/order"
};
