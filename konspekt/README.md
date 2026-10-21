# Конспект курсу «Сайт за 1 вечір з ШІ» — https://konspektsayt.kvn.kiev.ua

| Що | Де |
|---|---|
| Сторінка конспекту (7 блоків, галочки, промпти, посилання) | `index.html` |
| Файли до уроків (промпти, архів скіла) | `files/` |
| Скріни до уроків | `img/` — імена файлів видно в рамках-заглушках на сторінці |
| Скіл «Сайт під товар» (вихідні файли) | `skill/sait-pid-tovar/` — архів збирається автоматично при публікації |

## Доступ лише за посиланням
- Конспект лежить у секретній папці: `https://konspektsayt.kvn.kiev.ua/<KONSPEKT_KEY>/`.
  Секрет `KONSPEKT_KEY` — у GitHub → Settings → Secrets and variables → Actions (латиниця, цифри, `-`, `_`).
- Корінь піддомену показує «Сторінку не знайдено»; `robots.txt`, `X-Robots-Tag` і `<meta name="robots">` забороняють індексацію.
- Посилання «злилося»? Змініть `KONSPEKT_KEY` і запустіть Actions → Deploy konspekt → Run workflow. Нове посилання вставте в SendPulse.
- `root/` — файли кореня піддомену (заглушка, robots.txt, .htaccess).

## Публікація
Після змін у `konspekt/` в гілці `main` сайт сам заливається в `/kvn.kiev.ua/konspektsayt/`
(`.github/workflows/deploy-konspekt.yml`). Один раз: у adm.tools має бути піддомен `konspektsayt`
з увімкненим SSL. Якщо папка піддомену називається інакше — змініть `DEPLOY_DIR` у workflow
(подивитися структуру: Actions → Inspect hosting folders).

## Скріни, які чекають на файли
`hosting-rozpakuvaty.png`, `chrome-03-zakripyty.png`, `chrome-06-chat-saytu.png`, `chrome-07-dostup.png`, `chrome-10-perevirka.png` (урок «Claude in Chrome», Блок 5)
