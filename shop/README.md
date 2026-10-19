# Магазин «Тямко» (`/shop/`)

| Файл | Що це |
|---|---|
| `PRODUCTS.md` | 5 наборів: склад, формат, вимоги для друкарні, упаковка, ціни, собівартість, комплекти |
| `CREATIVES.md` | Сценарії Reels/Stories, тексти, заголовки, налаштування таргету й план тесту |
| `index.html`, `shop.css`, `shop.js` | Сайт магазину: каталог, комплекти, кошик, оформлення |
| `../api/shop-order.php` | Приймає замовлення і надсилає в Telegram (той самий бот, що й для курсу) |

## Що змінити перед запуском
1. **Ціни** — у двох місцях: `shop/shop.js` (`PRODUCTS`, `BUNDLES`) і `api/shop-order.php` (`$PRICES`).
2. **Фото** — покладіть у `shop/img/` і додайте товару `img: "img/назва.webp"`.
3. **Відгуки** — тільки справжні, у `shop/shop.js` → `REVIEWS`.
4. **Meta Pixel** — `shop/shop.js` → `CONFIG.pixelId`.
5. Контакти та ФОП у футері `index.html`.

## Як працює замовлення
Клієнт оформлює кошик → `api/shop-order.php` перераховує суму за власним прайсом (ціни з браузера не приймаються) → повідомлення з товарами, сумою, способом оплати, адресою НП і UTM приходить у Telegram, копія — у `private/shop-orders.log` на хостингу.

## Публікація: https://tyamko.noosal.shop
Окремий автодеплой `.github/workflows/deploy-shop.yml`: після змін у `shop/` в гілці `main` вміст `shop/` + `api/shop-order.php` завантажується в папку `/noosal.shop/tyamko/` (інші піддомени noosal.shop не зачіпаються). Токен Telegram записується в `/noosal.shop/private/config.php`. На kvn.kiev.ua магазин не викладається.

**Один раз перед першим запуском:** у панелі хостингу створіть піддомен `tyamko` для `noosal.shop` (папка `/noosal.shop/tyamko`) і ввімкніть для нього SSL (Let's Encrypt).
