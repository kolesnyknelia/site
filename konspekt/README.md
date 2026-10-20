# Конспект курсу «Сайт за 1 вечір з ШІ» — https://konspektsayt.kvn.kiev.ua

| Що | Де |
|---|---|
| Сторінка конспекту (7 блоків, галочки, промпти, посилання) | `index.html` |
| Файли до уроків (промпти, архів скіла) | `files/` |
| Скріни до уроків | `img/` — імена файлів видно в рамках-заглушках на сторінці |
| Скіл «Сайт під товар» (вихідні файли) | `skill/sait-pid-tovar/` — архів збирається автоматично при публікації |

## Публікація
Після змін у `konspekt/` в гілці `main` сайт сам заливається в `/kvn.kiev.ua/konspektsayt/`
(`.github/workflows/deploy-konspekt.yml`). Один раз: у adm.tools має бути піддомен `konspektsayt`
з увімкненим SSL. Якщо папка піддомену називається інакше — змініть `DEPLOY_DIR` у workflow
(подивитися структуру: Actions → Inspect hosting folders).

## Скріни, які чекають на файли
`botfather-token.png`, `telegram-stvoryty-hrupu.png`, `idbot-id-hrupy.png`, `lpcrm-klyuch-api.png`,
`lpcrm-id-tovaru.png`, `hosting-rozpakuvaty.png`
