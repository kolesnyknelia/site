/* 🔒 СЕКРЕТИ ДЛЯ VERCEL. Файли з «_» на початку Vercel не відкриває як сторінку —
   їх бачить тільки api/order.js на сервері.
   На хостинг Україна цей файл НЕ заливаємо (там працюють api/config.php і api/order.php).
   Ціни мають збігатися з js/config.js. */
module.exports = {
  shop: "Знахідки",
  product: "Назва товару",
  price: 599,          // ціна за 1 шт, грн
  discount2: 100,      // знижка на 2 шт, грн

  // Telegram: токен від @BotFather і ID групи (число з мінусом)
  tgToken: "",
  tgChat: "",

  // LP-CRM (необов'язково). Порожній domain — заявки йдуть тільки в Telegram
  lpcrmDomain: "",     // назва.lp-crm.biz
  lpcrmKey: "",        // «Вхідний ключ API»
  lpcrmProductId: "",  // ID товару
  lpcrmOffice: ""      // номер офісу, якщо їх кілька
};
