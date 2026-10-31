# Конспект курсу «Формула Claude» — https://konspektfc.kvn.kiev.ua/‹ключ›/

Структура курсу (та сама в SendPulse і на сайті продажу) — `../FORMULACLAUDE_PROGRAMA.md`.
Завдання для агента SendPulse — `../SENDPULSE_FORMULACLAUDE.md`.

| Що | Де |
|---|---|
| Сторінка (вкладки, галочки, пошук) | `index.html`, `js/app.js` |
| Помічники розмітки (промпт, скрін, файл, Паспорт товару) | `js/course.js` |
| 8 модулів (1 модуль = 1 урок у SendPulse) | `js/m1.js` … `js/m8.js` |
| Скріни | `img/` |
| Архів скіла «Сайт під товар» | збирається при публікації з `konspekt/skill/sait-pid-tovar/` → `files/sait-pid-tovar.zip` |

## Номери = SendPulse
Урок N у SendPulse = вкладка «Модуль N»: `#fc4` відкриває модуль 4, `#fc-4-2` — його крок 4.2, `#fc-4-dz` — домашнє.
id не змінюємо: за ними зберігаються галочки учнів.
Поля модуля: `need` (що потрібно), `why` («Чому так»), `checkpoint` + `send` (домашнє), `video` (підпис відео). Крок за бажанням — `optional: true`.

## Піддомен
Зараз у workflow `DEPLOY_DIR: /kvn.kiev.ua/konspektfc/` (адреса konspektfc.kvn.kiev.ua). Коли Неля дасть свій піддомен — змінити `DEPLOY_DIR` і назву в коментарях workflow.

## Публікація (один раз)
1. adm.tools → «Мої сайти» → kvn.kiev.ua → додати піддомен `konspektfc`, увімкнути SSL.
2. GitHub → Settings → Secrets and variables → Actions → `KONSPEKT_FC_KEY` (латиниця, цифри, `-`, `_`).
3. Після злиття в `main` — Actions → «Deploy konspekt FC» запуститься сам.
Посилання злилося — змініть `KONSPEKT_FC_KEY` і запустіть workflow вручну; нове посилання вставте в SendPulse.
