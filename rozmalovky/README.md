# Каталог розмальовок «Розмалюй момент» → https://rozmalovky.noosal.shop

| Файл | Що це |
|---|---|
| `index.html`, `style.css`, `app.js` | Сайт: ціни за кількістю, каталог з гортанням сторінок, вибір «Класична / Преміум», кошик, оформлення |
| `img/` | Обкладинки й сторінки (вирізані зі скрінів лендінгів; замініть на оригінальні фото — назви файлів ті самі) |
| `../api/rozmalovky-order.php` | Приймає замовлення, сам рахує суму за кількістю і надсилає в Telegram |

## Ціни (міняються в двох місцях: `app.js` → `CONFIG` і `api/rozmalovky-order.php`)
1 шт. — 349 грн · 2 шт. — 598 грн · 3 шт. — 799 грн · кожна наступна — +249 грн. Розмальовки й варіанти можна поєднувати.

## Як додати розмальовку
1. Покладіть фото в `img/` (обкладинка + 1–5 сторінок, `.webp` або `.jpg`).
2. Додайте запис у `PRODUCTS` в `app.js` і назву в `$PRODUCTS` в `api/rozmalovky-order.php` з тим самим `id`.

`hidden: true` ховає розмальовку з сайту (так зараз приховані «Гарі Поттер» і «Грінч» — чужі захищені персонажі).

## Публікація
`.github/workflows/deploy-rozmalovky.yml`: після змін у `rozmalovky/` в гілці `main` сайт завантажується в `/noosal.shop/rozmalovky/`.
Один раз: у панелі хостингу створіть піддомен `rozmalovky` для `noosal.shop` і ввімкніть SSL (Let's Encrypt).

## Другий домен: https://rozmalovki.top
Той самий каталог публікує `.github/workflows/deploy-rozmalovki-top.yml` у `/rozmalovki.top/www/` — зі своїми ключами
(секрети `RT_PIXEL_ID`, `RT_TG_BOT_TOKEN`, `RT_TG_CHAT_ID`, `RT_LPCRM_DOMAIN`, `RT_LPCRM_KEY`, `RT_LPCRM_PRODUCT_ID`, `RT_LPCRM_OFFICE`).
Поки свого Telegram немає, заявки йдуть у той самий чат, що з noosal.shop. Піксель без `RT_PIXEL_ID` вимкнений.
LP-CRM у `api/rozmalovky-order.php` вмикається лише там, де в private/config.php є `LPCRM_DOMAIN` і `LPCRM_KEY` (на noosal.shop їх немає — там нічого не змінилося).
