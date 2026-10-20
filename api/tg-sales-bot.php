<?php
/* Telegram-бот продавця розмальовок (webhook). Веде клієнта за скриптом продажу:
   підтвердження → 2 варіанти з фото → дані доставки → подарунок за оплату на ФОП → реквізити → квитанція.
   Усе, що пише клієнт, пересилається власниці; її відповідь (reply) бот передає клієнту.
   Команди власниці: /ttn RM… 20450000000000 — надіслати клієнту номер ТТН. */
define('APP', 1);
require __DIR__ . '/lib.php';
require __DIR__ . '/viber.php';

$TOKEN = secret('TG_SALES_BOT_TOKEN');
$OWNER = secret('TG_SALES_OWNER_ID') ?: secret('TG_CHAT_ID');
if (!$TOKEN) { http_response_code(404); exit; }
// Запити приймаємо лише від Telegram (secret_token задає setWebhook у deploy-rozmalovky.yml)
if (!hash_equals(substr(hash('sha256', $TOKEN), 0, 32), (string)g($_SERVER, 'HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'))) { http_response_code(403); exit; }

$D = require __DIR__ . '/rozmalovky-data.php';
$host = preg_replace('/[^a-z0-9.\-]/i', '', (string)g($_SERVER, 'HTTP_HOST', 'rozmalovky.noosal.shop'));
$IMG = 'https://' . $host . '/img/tg/';

$u = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($u)) exit;
echo 'ok';

/* ---------- Telegram API ---------- */
function api($method, $params) {
    global $TOKEN;
    $base = secret('TG_API_BASE') ?: 'https://api.telegram.org'; // лише для локальних тестів
    $ch = curl_init(rtrim($base, '/') . "/bot{$TOKEN}/{$method}");
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($params, JSON_UNESCAPED_UNICODE),
    ]);
    $r = json_decode((string)curl_exec($ch), true);
    curl_close($ch);
    if (empty($r['ok'])) log_line('tg-sales-bot.log', ['method' => $method, 'error' => g((array)$r, 'description', 'no response')]);
    return is_array($r) ? g($r, 'result', null) : null;
}
function say($chat, $html, $buttons = null) {
    $p = ['chat_id' => $chat, 'text' => $html, 'parse_mode' => 'HTML', 'disable_web_page_preview' => true];
    if ($buttons) $p['reply_markup'] = ['inline_keyboard' => array_map(function ($row) {
        return array_map(function ($b) { return ['text' => $b[0], 'callback_data' => $b[1]]; }, $row);
    }, $buttons)];
    return api('sendMessage', $p);
}

require __DIR__ . '/rozmalovky-shop.php';

/* ---------- Telegram-специфічне ---------- */
/** Підсумок після вибору варіанту: кількість, знижка, сума + кнопки «ще одна» / «оформити» */
function step_summary($chat, $o, $v) {
    global $D;
    $n = order_count($o); $full = $n * $D['price'][$v][1]; $total = (int)$o['total'];
    $next = next_price($o, $v);
    say($chat, "🧾 <b>Ваше замовлення</b> (" . mb_strtolower($D['variants'][$v], 'UTF-8') . ")\n" . order_lines($o, false)
        . "\n\nРазом: {$n} шт." . ($full > $total ? "\nЗвичайна ціна: <s>{$full} грн</s>\n🎉 Ваша знижка: <b>" . ($full - $total) . " грн</b>" : '')
        . "\n💰 До сплати: <b>{$total} грн</b> + доставка"
        . "\n\n🎁 Додайте ще одну розмальовку всього за <b>+{$next} грн</b>" . ($n < 3 ? ' — що більше, то вигідніше!' : ''),
        [[['➕ Додати ще одну (+' . $next . ' грн)', 'more']], [['🔁 Інший варіант', 'vq'], ['✅ Оформити', 'go']]]);
}
function who($o, $chat, $from) {
    $n = g($o, 'name') ?: trim(g($from, 'first_name') . ' ' . g($from, 'last_name'));
    $un = g($from, 'username') ? ' @' . $from['username'] : '';
    return h($n) . $un . (g($o, 'ref') ? ' · ' . $o['ref'] : '') . "\n#c{$chat}";
}

/* ---------- Кроки скрипту ---------- */
function step_variants($chat, $o) {
    global $D, $IMG;
    say($chat, 'Чудово! 🥰 Кожна розмальовка є у 2 варіантах — Класична та Преміальна. Зараз розпишу про кожну, а ви оберіть, яка підходить саме вам 👇');
    $seen = [];
    foreach ((array)g($o, 'items', []) as $i) {
        if (isset($seen[$i[0]]) || !isset($D['products'][$i[0]])) continue;
        $seen[$i[0]] = 1;
        $p = $D['products'][$i[0]];
        $c1 = $D['price']['classic'][1]; $p1 = $D['price']['premium'][1];
        $bp = isset($D['botPhotos'][$i[0]]) ? $D['botPhotos'][$i[0]] : [];
        // Спершу преміальна (з кольоровим прикладом), потім класична
        $albums = array_filter(["✨ Преміальна · {$p1} грн — з кольоровим прикладом" => g($bp, 'premium', []), "🍂 Класична · {$c1} грн — чорно-біла" => g($bp, 'classic', [])]);
        foreach ($albums as $cap => $imgs) {
            $cap .= "\n«" . $p[0] . '»';
            if (count($imgs) === 1) { api('sendPhoto', ['chat_id' => $chat, 'photo' => $IMG . $imgs[0] . '.jpg', 'caption' => $cap]); continue; }
            $media = [];
            foreach (array_slice($imgs, 0, 10) as $k => $im) $media[] = ['type' => 'photo', 'media' => $IMG . $im . '.jpg'] + ($k === 0 ? ['caption' => $cap] : []);
            api('sendMediaGroup', ['chat_id' => $chat, 'media' => $media]);
        }
        say($chat, '<b>«' . h($p[0]) . "»</b>\n" . h($p[2]));
    }
    $c = $D['price']['classic']; $pm = $D['price']['premium'];
    say($chat, h($D['variantText']['classic']) . "\n💰 1 — {$c[1]} грн, 2 — {$c[2]} грн, 3 — {$c[3]} грн (кожна наступна — ще {$D['extra']['classic']} грн)"
        . "\n\n" . h($D['variantText']['premium']) . "\n💰 1 — {$pm[1]} грн, 2 — {$pm[2]} грн, 3 — {$pm[3]} грн (кожна наступна — ще {$D['extra']['premium']} грн)"
        . "\n\n📖 20 аркушів = 20 картинок · формат A4 · металева пружина");
    ask_variant($chat);
}
function ask_variant($chat) {
    global $D; $c = $D['price']['classic']; $pm = $D['price']['premium'];
    say($chat, 'Вам яку оформляти: Класичну чи Преміальну? 😊', [[['🍂 Класичну · ' . $c[1] . ' грн', 'v:classic']], [['✨ Преміальну · ' . $pm[1] . ' грн', 'v:premium']]]);
}
function step_requisites($chat, $o) {
    global $D; $r = $D['requisites'];
    say($chat, "Дякуємо! 💝 Реквізити для оплати:\n\n🔹 Одержувач: ФОП " . h($r['recipient']) . "\nІПН / РНОКПП: {$r['code']}\n🔹 Банк: " . h($r['bank']) . "\n🔹 IBAN: <code>{$r['iban']}</code>"
        . "\n\n💰 Сума: <b>" . (int)g($o, 'total') . ' грн</b>'
        . "\n\n📝 Призначення платежу:\n<code>" . h(purpose($o)) . '</code>'
        . "\n\n❗ Обов'язково вкажіть призначення платежу саме так — за ним ми знайдемо ваше замовлення."
        . "\n\n✅ Чому вигідно оплатити одразу:"
        . "\n🔒 Безпечно — це офіційний рахунок ФОП, платіж іде через банк, у вас залишається квитанція"
        . "\n💸 Без комісії Нової пошти за накладений платіж (≈20 грн + 2% від суми) — ви економите"
        . "\n🎁 Розмальовка-сюрприз у подарунок"
        . "\n🚀 Відправляємо в день оплати"
        . "\n\n⏱ Це займе 1 хвилину: скопіюйте IBAN → у застосунку банку оберіть «Платіж за реквізитами» → вставте IBAN, суму й призначення → готово!");
    say($chat, "👇 Натисніть, щоб скопіювати IBAN:\n<code>{$r['iban']}</code>");
    say($chat, "👇 Натисніть, щоб скопіювати призначення:\n<code>" . h(purpose($o)) . '</code>');
    say($chat, 'Після оплати надішліть, будь ласка, сюди скрін квитанції 🙏');
}

/* ---------- Відповідь власниці → клієнту ---------- */
function owner_update($msg) {
    global $OWNER;
    $text = trim((string)g($msg, 'text'));
    if (preg_match('/^\/ttn\s+(RM\d+)\s+(\d{10,20})/i', $text, $m)) {
        $o = load('rm-orders', strtoupper($m[1]));
        if (!g($o, 'chat') && !g($o, 'vchat')) { say($OWNER, "⚠️ Замовлення {$m[1]} не знайдено або клієнт ще не відкривав бота."); return; }
        $ttn = "📦 Ваше замовлення відправлено!\nНомер ТТН Нової пошти: {$m[2]}\n\nВідстежити: https://novaposhta.ua/tracking/?cargo_number={$m[2]}\n\nГарного розмальовування! 🖍️❤️";
        if (g($o, 'chat')) say($o['chat'], str_replace("пошти: {$m[2]}", "пошти: <code>{$m[2]}</code>", $ttn));
        if (g($o, 'vchat')) viber_text($o['vchat'], $ttn);
        say($OWNER, "✅ ТТН {$m[2]} надіслано клієнту ({$m[1]}).");
        return;
    }
    $rep = g($msg, 'reply_to_message', []);
    // Відповідь клієнту з Viber (позначка #v<id>): Viber приймає лише текст
    if ($rep && preg_match('/#v([A-Za-z0-9+\/=]+)/', g($rep, 'text') . ' ' . g($rep, 'caption'), $m)) {
        if ($text === '') { say($OWNER, '⚠️ Клієнту у Viber можна відповісти лише текстом'); return; }
        $r = viber_text($m[1], $text);
        say($OWNER, $r && (int)g($r, 'status', -1) === 0 ? '✅ Надіслано клієнту у Viber' : '⚠️ Не вдалося надіслати у Viber');
        return;
    }
    if ($rep && preg_match('/#c(-?\d+)/', g($rep, 'text') . ' ' . g($rep, 'caption'), $m)) {
        $r = api('copyMessage', ['chat_id' => $m[1], 'from_chat_id' => $OWNER, 'message_id' => $msg['message_id']]);
        say($OWNER, $r ? '✅ Надіслано клієнту' : '⚠️ Не вдалося надіслати (клієнт міг заблокувати бота)');
        return;
    }
    if ($text) say($OWNER, "👋 Це бот-продавець розмальовок. Сюди приходять повідомлення клієнтів.\n\n"
        . "• Щоб відповісти клієнту — натисніть «Відповісти» (Reply) на його повідомлення й напишіть текст або надішліть фото.\n"
        . "• ТТН: <code>/ttn RM… номер</code>\n\nВаш chat id: <code>" . h(g(g($msg, 'chat', []), 'id')) . '</code>');
}

/* ---------- Обробка ---------- */
if (isset($u['callback_query'])) {
    $cq = $u['callback_query'];
    $chat = g(g(g($cq, 'message', []), 'chat', []), 'id');
    $data = (string)g($cq, 'data');
    api('answerCallbackQuery', ['callback_query_id' => $cq['id']]);
    // прибираємо кнопки з повідомлення, щоб не натискали двічі
    api('editMessageReplyMarkup', ['chat_id' => $chat, 'message_id' => $cq['message']['message_id'], 'reply_markup' => ['inline_keyboard' => []]]);

    if ((string)$chat === (string)$OWNER && preg_match('/^vpaid:([a-f0-9]{32})$/', $data, $m)) {
        $vs = load('rm-vbot', $m[1]);
        if (g($vs, 'vid')) viber_text($vs['vid'], 'Оплату отримали, дякуємо! ❤️ Відправляємо сьогодні — номер ТТН надішлю сюди. А розмальовка-сюрприз уже чекає у вашій посилці 🎁✨');
        say($OWNER, g($vs, 'vid') ? '✅ Клієнту у Viber надіслано підтвердження оплати' : '⚠️ Клієнта у Viber не знайдено');
        exit;
    }
    if ((string)$chat === (string)$OWNER && preg_match('/^paid:(-?\d+)$/', $data, $m)) {
        say($m[1], 'Оплату отримали, дякуємо! ❤️ Відправляємо сьогодні — номер ТТН надішлю сюди. А розмальовка-сюрприз уже чекає у вашій посилці 🎁✨');
        say($OWNER, '✅ Клієнту надіслано підтвердження оплати');
        exit;
    }

    $s = load('rm-bot', $chat);
    $o = g($s, 'ref') ? load('rm-orders', $s['ref']) : [];
    $tag = who($o, $chat, g($cq, 'from', []));
    if ($data === 'ok') {
        step_variants($chat, $o);
        $s['step'] = 'variant';
    } elseif ($data === 'chg') {
        say($chat, 'Звісно! ✍️ Напишіть, що хочете змінити у замовленні, — ми відповімо тут найближчим часом.');
        say($OWNER, "✏️ Клієнт хоче змінити замовлення\n{$tag}");
        $s['step'] = 'free';
    } elseif (preg_match('/^v:(classic|premium)$/', $data, $m)) {
        if ($o) {
            foreach ($o['items'] as &$i) $i[1] = $m[1];
            unset($i);
            $o['total'] = order_total($o['items']);
            save('rm-orders', $o['ref'], $o);
        }
        $s['variant'] = $m[1];
        say($OWNER, '🎨 Обрано: <b>' . $D['variants'][$m[1]] . '</b>' . ($o ? ' · сума ' . (int)$o['total'] . ' грн' : '') . "\n{$tag}");
        if ($o) { step_summary($chat, $o, $m[1]); $s['step'] = 'summary'; }
        else { say($chat, "Чудовий вибір! 🎨 Напишіть, будь ласка, ваші дані для відправки:\n• Прізвище та ім'я\n• Номер телефону\n• Місто та номер відділення або поштомата Нової пошти"); $s['step'] = 'delivery'; }
    } elseif ($data === 'vq') {
        ask_variant($chat);
    } elseif ($data === 'more' && $o) {
        $rows = [];
        foreach ($D['visible'] as $id) if (isset($D['products'][$id])) $rows[] = [['➕ ' . $D['products'][$id][0], 'add:' . $id]];
        $rows[] = [['⬅️ Назад', 'back']];
        say($chat, 'Яку розмальовку додати? 👇', $rows);
    } elseif (preg_match('/^add:([a-z]+)$/', $data, $m) && $o && in_array($m[1], $D['visible'], true)) {
        $v = g($s, 'variant', 'classic'); $found = false;
        foreach ($o['items'] as &$i) if ($i[0] === $m[1] && $i[1] === $v) { $i[2]++; $found = true; }
        unset($i);
        if (!$found) $o['items'][] = [$m[1], $v, 1];
        $o['total'] = order_total($o['items']);
        save('rm-orders', $o['ref'], $o);
        say($OWNER, '➕ Клієнт додав «' . h($D['products'][$m[1]][0]) . '» · тепер ' . order_count($o) . ' шт., ' . $o['total'] . " грн\n{$tag}");
        step_summary($chat, $o, $v);
    } elseif ($data === 'back' && $o) {
        step_summary($chat, $o, g($s, 'variant', 'classic'));
    } elseif ($data === 'go' && $o) {
        say($chat, "Чудово! 🎨 Напишіть, будь ласка, ваші дані для відправки:\n• Прізвище та ім'я\n• Номер телефону\n• Місто та номер відділення або поштомата Нової пошти");
        say($OWNER, "✅ <b>Замовлення підтверджено</b>\n" . order_lines($o) . "\nРазом: " . order_count($o) . " шт. · <b>" . (int)$o['total'] . " грн</b>\n{$tag}");
        $s['step'] = 'delivery';
    } elseif ($data === 'pay:fop') {
        step_requisites($chat, $o);
        say($OWNER, "💳 Клієнт оплачує на ФОП (" . (int)g($o, 'total') . " грн), чекаємо квитанцію\n{$tag}");
        $s['step'] = 'receipt';
    } elseif ($data === 'pay:cod') {
        say($chat, 'Добре, без проблем! 😊 Відправимо накладеним платежем — оплата при отриманні на Новій пошті (Нова пошта бере невелику комісію за переказ). Відправка сьогодні, номер ТТН надішлю сюди 📦');
        say($OWNER, "📦 Клієнт обрав <b>оплату при отриманні</b> — можна відправляти накладеним платежем\n{$tag}");
        $s['step'] = 'done';
    }
    save('rm-bot', $chat, $s);
    exit;
}

$msg = g($u, 'message', []);
if (!$msg || g(g($msg, 'chat', []), 'type') !== 'private') exit;
$chat = $msg['chat']['id'];
$text = trim((string)g($msg, 'text'));
$s = load('rm-bot', $chat);
// Власниця теж може пройти скрипт як клієнт (тест): /start RM… і дані доставки; решта — службові повідомлення
if ((string)$chat === (string)$OWNER && !preg_match('/^\/start\s+\S/', $text)
    && !(g($s, 'step') === 'delivery' && $text !== '' && $text[0] !== '/' && !isset($msg['reply_to_message']))) { owner_update($msg); exit; }

// /start RM… — клієнт прийшов зі сторінки «Дякуємо»
if (preg_match('/^\/start(?:\s+(\S+))?/', $text, $m)) {
    $ref = isset($m[1]) ? preg_replace('/[^A-Za-z0-9]/', '', $m[1]) : '';
    $o = $ref ? load('rm-orders', $ref) : [];
    if ($ref === 'help' || !$ref && !$o) {
        $s = ['step' => 'free'];
        say($chat, help_text());
        say($OWNER, "🆘 Клієнт відкрив підтримку\n" . who([], $chat, g($msg, 'from', [])));
    } elseif ($o) {
        $o['chat'] = $chat; save('rm-orders', $ref, $o);
        $s = ['ref' => $ref, 'step' => 'confirm'];
        say($chat, 'Доброго дня, ' . h(first_name($o['name'])) . '! 😊 Ви лишали заявку на ' . h(titles($o)) . ". Чи актуальне ваше замовлення?\n\n🧾 Замовлення № {$ref}\n" . order_lines($o, false),
            [[['✅ Так, актуальне', 'ok'], ['✏️ Хочу змінити', 'chg']]]);
        say($OWNER, "✈️ Клієнт відкрив бота — скрипт запущено\n" . who($o, $chat, g($msg, 'from', [])));
    } else {
        $s = ['step' => 'free'];
        say($chat, 'Доброго дня! 😊 Це магазин розмальовок «Розмалюй момент». Напишіть, будь ласка, ваше питання або номер замовлення — ми відповімо тут.');
        say($OWNER, "👋 Новий клієнт у боті (без замовлення)\n" . who([], $chat, g($msg, 'from', [])));
    }
    save('rm-bot', $chat, $s);
    exit;
}

if ($text === '/help') { say($chat, help_text()); exit; }

$o = g($s, 'ref') ? load('rm-orders', $s['ref']) : [];
$tag = who($o, $chat, g($msg, 'from', []));
$step = g($s, 'step', 'free');

if (isset($msg['photo']) || isset($msg['document'])) {
    $p = ['chat_id' => $OWNER, 'from_chat_id' => $chat, 'message_id' => $msg['message_id'],
        'caption' => ($step === 'receipt' ? '🧾 Квитанція' : '📎 Файл від клієнта') . (g($o, 'total') ? ' · ' . (int)$o['total'] . ' грн' : '') . "\n" . strip_tags($tag)];
    if ($step === 'receipt') $p['reply_markup'] = ['inline_keyboard' => [[['text' => '✅ Оплату підтверджено', 'callback_data' => "paid:{$chat}"]]]];
    api('copyMessage', $p);
    if ($step === 'receipt') {
        say($chat, 'Дякуємо! 🙏 Квитанцію отримали — перевіримо надходження й напишемо вам тут.');
        $s['step'] = 'done'; save('rm-bot', $chat, $s);
    }
    exit;
}
if ($text === '') exit;

if ($step === 'delivery') {
    $o['delivery'] = str_cut($text, 500);
    if (g($o, 'ref')) save('rm-orders', $o['ref'], $o);
    say($OWNER, "🚚 <b>Дані для відправки</b>\n" . h($text) . "\n\n" . $tag);
    say($chat, h($D['gift']), [[['💳 Так, оплачу на ФОП', 'pay:fop']], [['📦 Оплачу при отриманні', 'pay:cod']]]);
    $s['step'] = 'pay'; save('rm-bot', $chat, $s);
    exit;
}

// Будь-яке інше повідомлення — власниці; вона відповідає через Reply
say($OWNER, '💬 ' . h($text) . "\n\n" . $tag);
if (in_array($step, ['confirm', 'variant', 'summary', 'pay'], true)) say($chat, 'Дякуємо! Передали ваше повідомлення менеджеру — відповімо тут 🙂 А поки можна обрати варіант кнопками вище 👆');
