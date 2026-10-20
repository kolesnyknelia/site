# Урок «Частина 3. Сайт під товар»

| Файл | Що це |
|---|---|
| `urok.html` | Сторінка-конспект уроку українською (як на kurs.znahidky.shop): меню кроків, галочки «Зроблено X з 7», кнопки «Відкрити», «Завантажити» скіл, «Скопіювати промпт» |
| `img/` | Сюди кладемо скріни для уроку — вони з'являються на сторінці самі (поки файлу немає, видно рамку з його назвою) |
| `prompt.txt` | Промпт для учнів (той самий, що в кроці 4 уроку) |
| `sait-pid-tovar.zip` | Скіл «Сайт під товар» — прикріпіть до уроку як файл. Учні перетягують його в Claude: «Встанови цей скіл» |
| `skill/sait-pid-tovar/` | Вихідні файли скіла (інструкція `SKILL.md` + готовий шаблон сайту `template/`) |

## Скріни (імена файлів у `img/`)
`botfather-token.png`, `telegram-stvoryty-hrupu.png`, `telegram-nova-hrupa.png`, `telegram-hrupa-uchasnyky.png`, `idbot-id-hrupy.png`, `lpcrm-klyuch-api.png`, `lpcrm-sklad-tovary.png`, `lpcrm-id-tovaru.png`

## Перед публікацією
1. Замінити приклади сайтів (`tovar.vash-domen.shop`, `nazva.vercel.app`) на свої живі приклади.
2. Вписати дедлайн домашнього завдання.
3. Для SendPulse: дати в уроці посилання на цю сторінку і прикріпити `sait-pid-tovar.zip` файлом.

## Як перезібрати архів скіла після змін
```bash
cd urok-sait/skill && rm -f ../sait-pid-tovar.zip && zip -rq -X ../sait-pid-tovar.zip sait-pid-tovar
```
