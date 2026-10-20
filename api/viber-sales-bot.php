<?php
/* Viber-бот продавця розмальовок (webhook) — той самий скрипт, що в Telegram-боті:
   підтвердження → 2 варіанти з фото → підсумок зі знижкою (+ ще одна) → доставка → подарунок → реквізити → квитанція.
   Сповіщення приходять власниці в Telegram (бот-продавець) з позначкою #v<id>; її Reply бот передає клієнту у Viber. */
define('APP', 1);
require __DIR__ . '/lib.php';
require __DIR__ . '/viber.php';

$VTOKEN = secret('VIBER_BOT_TOKEN');
if (!$VTOKEN) { http_response_code(404); exit; }
$raw = (string)file_get_contents('php://input');
// Запити приймаємо лише від Viber: підпис тіла HMAC-SHA256 токеном бота
if (!hash_equals(hash_hmac('sha256', $raw, $VTOKEN), (string)g($_SERVER, 'HTTP_X_VIBER_CONTENT_SIGNATURE'))) { http_response_code(403); exit; }

$D = require __DIR__ . '/rozmalovky-data.php';
require __DIR__ . '/rozmalovky-shop.php';
$host = preg_replace('/[^a-z0-9.\-]/i', '', (string)g($_SERVER, 'HTTP_HOST', 'rozmalovky.noosal.shop'));
$IMG = 'https://' . $host . '/img/tg/';

$u = json_decode($raw, true);
if (!is_array($u)) exit;
$event = (string)g($u, 'event');

/* ---------- Сповіщення власниці — у Telegram (бот-продавець) ---------- */
function owner_say($html, $buttons = null) {
    $token = secret('TG_SALES_BOT_TOKEN'); $owner = secret('TG_SALES_OWNER_ID') ?: secret('TG_CHAT_ID');
    if (!$token || !$owner) return;
    $p = ['chat_id' => $owner, 'text' => $html, 'parse_mode' => 'HTML', 'disable_web_page_preview' => true];
    if ($buttons) $p['reply_markup'] = ['inline_keyboard' => $buttons];
    $base = secret('TG_API_BASE') ?: 'https://api.telegram.org';
    $ch = curl_init(rtrim($base, '/') . "/bot{$token}/sendMessage");
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'], CURLOPT_POSTFIELDS => json_encode($p, JSON_UNESCAPED_UNICODE)]);
    curl_exec($ch); curl_close($ch);
}
function vwho($o, $vid, $name) { return h(g($o, 'name') ?: $name) . ' · Viber' . (g($o, 'ref') ? ' · ' . $o['ref'] : '') . "\n#v{$vid}"; }
// id користувача Viber містить + / = — для імені файлу беремо хеш
function vkey($vid) { return substr(hash('sha256', $vid), 0, 32); }

/* ---------- Кроки скрипту ---------- */
function v_confirm_text($o) {
    return 'Доброго дня, ' . first_name($o['name']) . '! 😊 Ви лишали заявку на ' . titles($o) . ". Чи актуальне ваше замовлення?\n\n🧾 Замовлення № {$o['ref']}\n" . strip_tags(html_entity_decode(order_lines($o, false), ENT_QUOTES, 'UTF-8'));
}
function v_ask_variant($vid) {
    global $D; $c = $D['price']['classic']; $pm = $D['price']['premium'];
    viber_text($vid, 'Вам яку оформляти: Класичну чи Преміальну? 😊', [['✨ Преміальну · ' . $pm[1] . ' грн', 'v:premium'], ['🍂 Класичну · ' . $c[1] . ' грн', 'v:classic']]);
}
function v_variants($vid, $o) {
    global $D, $IMG;
    viber_text($vid, 'Чудово! 🥰 Кожна розмальовка є у 2 варіантах — Класична та Преміальна. Зараз покажу, а ви оберіть, яка підходить саме вам 👇');
    $seen = [];
    foreach ((array)g($o, 'items', []) as $i) {
        if (isset($seen[$i[0]]) || !isset($D['products'][$i[0]])) continue;
        $seen[$i[0]] = 1;
        $p = $D['products'][$i[0]];
        $bp = isset($D['botPhotos'][$i[0]]) ? $D['botPhotos'][$i[0]] : [];
        $c1 = $D['price']['classic'][1]; $p1 = $D['price']['premium'][1];
        foreach (["✨ Преміальна · {$p1} грн — з кольоровим прикладом" => g($bp, 'premium', []), "🍂 Класична · {$c1} грн — чорно-біла" => g($bp, 'classic', [])] as $cap => $imgs)
            foreach (array_slice($imgs, 0, 3) as $im) viber_picture($vid, $IMG . $im . '.jpg', $cap . "\n«" . $p[0] . '»');
        viber_text($vid, '«' . $p[0] . "»\n" . $p[2]);
    }
    $c = $D['price']['classic']; $pm = $D['price']['premium'];
    viber_text($vid, $D['variantText']['premium'] . "\n💰 1 — {$pm[1]} грн, 2 — {$pm[2]} грн, 3 — {$pm[3]} грн"
        . "\n\n" . $D['variantText']['classic'] . "\n💰 1 — {$c[1]} грн, 2 — {$c[2]} грн, 3 — {$c[3]} грн"
        . "\n\n📖 20 аркушів = 20 картинок · формат A4 · металева пружина");
    v_ask_variant($vid);
}
function v_summary($vid, $o, $v) {
    global $D;
    $n = order_count($o); $full = $n * $D['price'][$v][1]; $total = (int)$o['total']; $next = next_price($o, $v);
    viber_text($vid, '🧾 Ваше замовлення (' . mb_strtolower($D['variants'][$v], 'UTF-8') . ")\n" . strip_tags(html_entity_decode(order_lines($o, false), ENT_QUOTES, 'UTF-8'))
        . "\n\nРазом: {$n} шт." . ($full > $total ? "\nЗвичайна ціна: {$full} грн\n🎉 Ваша знижка: " . ($full - $total) . ' грн' : '')
        . "\n💰 До сплати: {$total} грн + доставка"
        . "\n\n🎁 Додайте ще одну розмальовку всього за +{$next} грн" . ($n < 3 ? ' — що більше, то вигідніше!' : ''),
        [['✅ Оформити', 'go'], ['➕ Додати ще одну (+' . $next . ' грн)', 'more'], ['🔁 Інший варіант', 'vq']]);
}
function v_delivery($vid) {
    viber_text($vid, "Чудово! 🎨 Напишіть, будь ласка, ваші дані для відправки:\n• Прізвище та ім'я\n• Номер телефону\n• Місто та номер відділення або поштомата Нової пошти");
}
function v_requisites($vid, $o) {
    global $D; $r = $D['requisites'];
    viber_text($vid, "Дякуємо! 💝 Реквізити для оплати:\n\n🔹 Одержувач: ФОП {$r['recipient']}\nІПН / РНОКПП: {$r['code']}\n🔹 Банк: {$r['bank']}\n🔹 IBAN: {$r['iban']}"
        . "\n\n💰 Сума: " . (int)g($o, 'total') . ' грн'
        . "\n\n📝 Призначення платежу:\n" . purpose($o)
        . "\n\n❗ Обов'язково вкажіть призначення платежу саме так — за ним ми знайдемо ваше замовлення."
        . "\n\n✅ Чому вигідно оплатити одразу:\n🔒 Безпечно — офіційний рахунок ФОП, у вас залишається квитанція\n💸 Без комісії Нової пошти за накладений платіж\n🎁 Розмальовка-сюрприз у подарунок\n🚀 Відправляємо в день оплати");
    viber_text($vid, '👇 IBAN (затисніть, щоб скопіювати):');
    viber_text($vid, $r['iban']);
    viber_text($vid, '👇 Призначення платежу:');
    viber_text($vid, purpose($o));
    viber_text($vid, 'Після оплати надішліть, будь ласка, сюди скрін квитанції 🙏');
}

/* ---------- Події ---------- */
if ($event === 'webhook' || $event === 'subscribed' || $event === 'unsubscribed' || $event === 'delivered' || $event === 'seen') { echo 'ok'; exit; }

// Клієнт відкрив чат зі сторінки «Дякуємо»: viber://pa?chatURI=…&context=RM…
// На цю подію Viber дозволяє відповісти лише одним вітальним повідомленням — у тілі відповіді
if ($event === 'conversation_started') {
    $vid = (string)g(g($u, 'user', []), 'id'); $name = (string)g(g($u, 'user', []), 'name');
    $ref = preg_replace('/[^A-Za-z0-9]/', '', (string)g($u, 'context'));
    $o = $ref ? load('rm-orders', $ref) : [];
    header('Content-Type: application/json; charset=utf-8');
    $msg = ['type' => 'text', 'min_api_version' => 3, 'sender' => ['name' => 'Розмалюй момент']];
    if ($o) {
        $o['vchat'] = $vid; save('rm-orders', $ref, $o);
        save('rm-vbot', vkey($vid), ['vid' => $vid, 'name' => $name, 'ref' => $ref, 'step' => 'confirm']);
        $msg['text'] = v_confirm_text($o);
        $msg['keyboard'] = viber_keyboard([['✅ Так, актуальне', 'ok'], ['✏️ Хочу змінити', 'chg']]);
        owner_say("💜 Клієнт відкрив Viber-бота — скрипт запущено\n" . vwho($o, $vid, $name));
    } else {
        save('rm-vbot', vkey($vid), ['vid' => $vid, 'name' => $name, 'step' => 'free']);
        $msg['text'] = help_text();
        owner_say("💜 Новий клієнт у Viber-боті\n" . vwho([], $vid, $name));
    }
    echo json_encode($msg, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($event !== 'message') { echo 'ok'; exit; }
echo 'ok';
$vid = (string)g(g($u, 'sender', []), 'id'); $name = (string)g(g($u, 'sender', []), 'name');
$m = g($u, 'message', []);
$s = load('rm-vbot', vkey($vid)) ?: ['vid' => $vid, 'name' => $name, 'step' => 'free'];
$o = g($s, 'ref') ? load('rm-orders', $s['ref']) : [];
$tag = vwho($o, $vid, $name);
$step = g($s, 'step', 'free');
$text = trim((string)g($m, 'text'));

// Фото / файл: квитанція або вкладення — власниці
if (in_array(g($m, 'type'), ['picture', 'file'], true)) {
    $cap = ($step === 'receipt' ? '🧾 Квитанція' : '📎 Файл від клієнта') . (g($o, 'total') ? ' · ' . (int)$o['total'] . ' грн' : '');
    owner_say($cap . "\n" . h((string)g($m, 'media')) . "\n\n" . $tag,
        $step === 'receipt' ? [[['text' => '✅ Оплату підтверджено', 'callback_data' => 'vpaid:' . vkey($vid)]]] : null);
    if ($step === 'receipt') { viber_text($vid, 'Дякуємо! 🙏 Квитанцію отримали — перевіримо надходження й напишемо вам тут.'); $s['step'] = 'done'; }
    save('rm-vbot', vkey($vid), $s);
    exit;
}
if ($text === '') exit;

if ($text === 'ok' && $o) {
    v_variants($vid, $o); $s['step'] = 'variant';
} elseif ($text === 'chg') {
    viber_text($vid, 'Звісно! ✍️ Напишіть, що хочете змінити у замовленні, — ми відповімо тут найближчим часом.');
    owner_say("✏️ Клієнт хоче змінити замовлення\n{$tag}"); $s['step'] = 'free';
} elseif (preg_match('/^v:(classic|premium)$/', $text, $mm) && $o) {
    foreach ($o['items'] as &$i) $i[1] = $mm[1];
    unset($i);
    $o['total'] = order_total($o['items']); save('rm-orders', $o['ref'], $o);
    $s['variant'] = $mm[1];
    owner_say('🎨 Обрано: <b>' . $D['variants'][$mm[1]] . '</b> · сума ' . (int)$o['total'] . " грн\n{$tag}");
    v_summary($vid, $o, $mm[1]); $s['step'] = 'summary';
} elseif ($text === 'vq') {
    v_ask_variant($vid);
} elseif ($text === 'more' && $o) {
    $rows = [];
    foreach ($D['visible'] as $id) if (isset($D['products'][$id])) $rows[] = ['➕ ' . $D['products'][$id][0], 'add:' . $id];
    $rows[] = ['⬅️ Назад', 'back'];
    viber_text($vid, 'Яку розмальовку додати? 👇', $rows);
} elseif (preg_match('/^add:([a-z]+)$/', $text, $mm) && $o && in_array($mm[1], $D['visible'], true)) {
    $v = g($s, 'variant', 'classic'); $found = false;
    foreach ($o['items'] as &$i) if ($i[0] === $mm[1] && $i[1] === $v) { $i[2]++; $found = true; }
    unset($i);
    if (!$found) $o['items'][] = [$mm[1], $v, 1];
    $o['total'] = order_total($o['items']); save('rm-orders', $o['ref'], $o);
    owner_say('➕ Клієнт додав «' . h($D['products'][$mm[1]][0]) . '» · тепер ' . order_count($o) . ' шт., ' . $o['total'] . " грн\n{$tag}");
    v_summary($vid, $o, $v);
} elseif ($text === 'back' && $o) {
    v_summary($vid, $o, g($s, 'variant', 'classic'));
} elseif ($text === 'go' && $o) {
    v_delivery($vid);
    owner_say("✅ <b>Замовлення підтверджено (Viber)</b>\n" . order_lines($o) . "\nРазом: " . order_count($o) . ' шт. · <b>' . (int)$o['total'] . " грн</b>\n{$tag}");
    $s['step'] = 'delivery';
} elseif ($text === 'pay:fop') {
    v_requisites($vid, $o);
    owner_say('💳 Клієнт оплачує на ФОП (' . (int)g($o, 'total') . " грн), чекаємо квитанцію\n{$tag}"); $s['step'] = 'receipt';
} elseif ($text === 'pay:cod') {
    viber_text($vid, 'Добре, без проблем! 😊 Відправимо накладеним платежем — оплата при отриманні на Новій пошті. Відправка сьогодні, номер ТТН надішлю сюди 📦');
    owner_say("📦 Клієнт обрав <b>оплату при отриманні</b>\n{$tag}"); $s['step'] = 'done';
} elseif ($step === 'delivery') {
    if ($o) { $o['delivery'] = str_cut($text, 500); save('rm-orders', $o['ref'], $o); }
    owner_say("🚚 <b>Дані для відправки</b>\n" . h($text) . "\n\n" . $tag);
    viber_text($vid, $D['gift'], [['💳 Так, оплачу на ФОП', 'pay:fop'], ['📦 Оплачу при отриманні', 'pay:cod']]);
    $s['step'] = 'pay';
} else {
    // Будь-яке інше повідомлення — власниці; вона відповідає через Reply у Telegram
    owner_say('💬 ' . h($text) . "\n\n" . $tag);
    if ($step === 'free') viber_text($vid, 'Дякуємо! Передали ваше повідомлення менеджеру — відповімо тут 🙂');
}
save('rm-vbot', vkey($vid), $s);
