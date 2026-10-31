# Конспект курсу «Формула Claude» — https://konspektfc.kvn.kiev.ua/‹ключ›/

Структура курсу (та сама в SendPulse і на сайті продажу) — `../FORMULACLAUDE_PROGRAMA.md`.
Завдання для агента SendPulse — `../SENDPULSE_FORMULACLAUDE.md`.

| Що | Де |
|---|---|
| Сторінка (вкладки, галочки, пошук) | `index.html`, `js/app.js` |
| Помічники розмітки (промпт, скрін, файл, Паспорт товару) | `js/course.js` |
| Уроки модулів 0–6 і Бонус | `js/m0.js` … `js/m6.js`, `js/bonus.js` |
| Скріни | `img/` |
| Архів скіла «Сайт під товар» | збирається при публікації з `konspekt/skill/sait-pid-tovar/` → `files/sait-pid-tovar.zip` |

## Номери уроків = SendPulse
id уроку — `fc-<модуль>-<урок>`: урок 3.2 → `#fc-3-2`, бонус Б.1 → `#fc-b-1`.
У SendPulse під кожним відео — посилання `https://konspektfc.kvn.kiev.ua/<KONSPEKT_FC_KEY>/#fc-3-2`.
id не змінюємо: за ними зберігаються галочки учнів.
Текстовий урок без відео — `video: false` (показується «📖 без відео»).

## Публікація (один раз)
1. adm.tools → «Мої сайти» → kvn.kiev.ua → додати піддомен `konspektfc`, увімкнути SSL.
2. GitHub → Settings → Secrets and variables → Actions → `KONSPEKT_FC_KEY` (латиниця, цифри, `-`, `_`).
3. Після злиття в `main` — Actions → «Deploy konspekt FC» запуститься сам.
Посилання злилося — змініть `KONSPEKT_FC_KEY` і запустіть workflow вручну; нове посилання вставте в SendPulse.
