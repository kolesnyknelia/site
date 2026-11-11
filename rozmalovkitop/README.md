# Копія rozmalovki.top → https://rozmalovkitop.noosal.shop

Повна копія сайту «Зима міленіалів» з rozmalovki.top, але з вашими «внутрощами»:
- заявки (`api/order.php`) → ваш Telegram і LP-CRM (товар **147**); ключі лежать на хостингу в `/noosal.shop/private/config.php`;
- Meta Pixel — `js/config.js` → `pixelId` (ваш піксель з інших сайтів розмальовок); TikTok Pixel вимкнено (`tiktokPixelId`).

Ціни й допродажі міняються у двох місцях: `js/config.js` (що бачить покупець) і `api/order.php` (що рахує сервер).
Публікація: `.github/workflows/deploy-rozmalovkitop.yml` — сама після змін у цій папці в гілці `main`.
