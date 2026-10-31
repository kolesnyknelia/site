# Автоматичний продаж курсу: оплата → доступ → Telegram → підтримка

## Як це працює
```
Сайт kvn.kiev.ua → «Купити за $29» → ім'я + email (+ телефон, Telegram)
   │
   ├─► api/order.php   → 🟡 вам у Telegram: «новий лід перейшов до оплати» (+ звідки прийшов: UTM)
   │                    → перехід на сторінку оплати WayForPay
   │
   ├─► WayForPay → api/wfp-callback.php (сервер-сервер, перевірка підпису)
   │        ✅ Approved → email додається в адресну книгу SendPulse → автоматизація відкриває курс
   │                    → вам у Telegram: «ОПЛАТА $29, ім'я, email, телефон, доступ відкрито ✅/❗»
   │        ❌ Declined → вам у Telegram: «оплата не пройшла» (можна написати клієнту)
   │
   └─► api/return.php  → клієнту: «Оплата пройшла, доступ на email, якщо немає — 💬 підтримка»
```
Усі замовлення зберігаються на сервері в `/kvn.kiev.ua/private/` (поза сайтом, ззовні недоступно).

## Що налаштувати (один раз)

### 1. GitHub Secrets
https://github.com/kolesnyknelia/site/settings/secrets/actions → **New repository secret**

| Name | Де взяти |
|------|----------|
| `WFP_MERCHANT` | WayForPay → Магазини → ваш магазин → **Merchant login** |
| `WFP_SECRET` | там само → **Merchant secret key** |
| `TG_BOT_TOKEN` | @BotFather → ваш бот → API token |
| `TG_CHAT_ID` | ID чату, куди слати сповіщення (можна дізнатись у @userinfobot) |
| `SP_CLIENT_ID` | SendPulse → Налаштування акаунта → **API** → ID |
| `SP_CLIENT_SECRET` | там само → Secret |
| `SP_BOOK_ID` | SendPulse → Адресні книги → книга «Покупці курсу» → число в адресі сторінки |

Після додавання секретів: **Actions → Deploy to hosting (FTP) → Run workflow**. Ключі запишуться на сервер.
У лозі видно лише назви заповнених ключів, самих значень — ні.

### 2. WayForPay
- Додайте домен **kvn.kiev.ua** у налаштуваннях магазину (його має бути підтверджено).
- Валюта: **USD** (змінюється в `api/settings.php`).

### 3. SendPulse
- Створіть адресну книгу «Покупці курсу».
- Automation 360 → новий ланцюжок із тригером **«Додавання в адресну книгу»** (ця книга) →
  дія **запис на курс** / лист із доступом до уроків.
- Зробіть тестову покупку і перевірте, що лист прийшов.

### 4. Help-бот
У `js/config.js` → `helpBot: "https://t.me/ваш_help_бот"` і в `api/settings.php` → `help_bot`.

## Ціна
Змінюється в **двох** місцях: `api/settings.php` (`price`, `currency`) — для оплати, і `js/config.js` (`plans.course.price`) — для показу на сайті.

---

# «Формула Claude» — formulaclaude.kvn.kiev.ua

Так само, як курс kvn.kiev.ua, але окремі файли (старий сайт не змінюється):

| Файл у репозиторії | На хостингу (`/kvn.kiev.ua/formulaclaude/api/`) |
|---|---|
| `api/fc-settings.php` | `settings.php` — пакети й ціни, домен, **`sp_book_id`** |
| `api/fc-order.php` | `order.php` — форма «Купити» → Telegram → WayForPay |
| `api/fc-wfp-callback.php` | `wfp-callback.php` — перевірка оплати → книга SendPulse «Покупці Формула Claude» |
| `api/fc-return.php` | `return.php` — сторінка після оплати |

- Ключі WayForPay / Telegram / SendPulse — ті самі (`/kvn.kiev.ua/private/config.php`).
- **WayForPay:** у магазині `www_kvn_kiev_ua` додати домен `formulaclaude.kvn.kiev.ua`.
- **SendPulse:** книга «Покупці Формула Claude» + Automation 360 «книга → записати на курс «Формула Claude»». ID книги вписати в `api/fc-settings.php` → `sp_book_id`. Поки порожньо — оплата приймається, у Telegram приходить «доступ ще не відкрито», а сайт повторює спробу, щойно ID з'явиться (WayForPay повторює до ~4 діб).
- Ціни пакетів: `api/fc-settings.php` (`packs`) **і** `formulaclaude/index.html` (`PACKS`).
- Тест: `python3 backend/tests/test_formulaclaude_payment.py`.
