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


## rozmalovkitop.noosal.shop
Лендінг «Зима міленіалів» (`milenialy/`) ще й на піддомені rozmalovkitop — `.github/workflows/deploy-rozmalovkitop.yml`.
Заявки звідти йдуть у той самий Telegram і ще в LP-CRM (товар ID 147). ID товару — `LPCRM_PRODUCT_ID` у workflow.
LP-CRM вмикається лише там, де деплой поклав `api/crm.php`, тож каталог і nazad у CRM не пишуть.
