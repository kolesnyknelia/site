<?php
/* Замовлення з каталогу розмальовок (rozmalovky/) → Telegram. Ціна залежить від кількості в кошику */
define('APP', 1);
require __DIR__ . '/lib.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit(json_encode(['ok' => false])); }

// Ті самі товари й ціни, що в rozmalovky/app.js — суму з браузера не беремо
$PRODUCTS = [
    'mykolai'   => 'Чудеса від Святого Миколая',
    'selo'      => 'Зима в українському селі',
    'milenialy' => 'Зима міленіалів: назад у дитинство',
    'dusha'     => 'Розмальовка для душі: осінь',
    'christmas' => 'Атмосферна розмальовка Merry Christmas',
    'halloween' => 'Розмальовка Halloween',
    'khvostyky' => 'Розмальовка хвостиків',
    'zhyttya'   => 'Розмальовка нашого життя',
];
$VARIANTS = ['classic' => 'Класична', 'premium' => 'Преміум'];
$PRICE = [1 => 349, 2 => 598, 3 => 799];
$EXTRA = 249;
$price_for = function ($n) use ($PRICE, $EXTRA) { return $n <= 0 ? 0 : (isset($PRICE[$n]) ? $PRICE[$n] : $PRICE[3] + ($n - 3) * $EXTRA); };

$name    = trim(str_cut((string)g($_POST, 'name'), 80));
$phone   = preg_replace('/[^\d+]/', '', (string)g($_POST, 'phone'));
// Telegram покупця: @нік або номер. Доставку й оплату уточнюють потім у Telegram або дзвінком
$tgUser  = trim(str_cut((string)g($_POST, 'telegram'), 64));
$tgNick  = preg_match('/^@?([A-Za-z][A-Za-z0-9_]{4,31})$/', $tgUser, $m) ? $m[1] : '';
$cart    = json_decode((string)g($_POST, 'cart', '{}'), true);
$utm     = json_decode((string)g($_POST, 'utm', '{}'), true);
$utm     = is_array($utm) ? array_slice($utm, 0, 8) : array();
foreach ($utm as $k => $v) $utm[$k] = str_cut((string)$v, 120);

$lines = array(); $count = 0;
if (is_array($cart)) {
    foreach ($cart as $key => $qty) {
        $qty = (int)$qty;
        $parts = explode(':', (string)$key);
        if (count($parts) !== 2 || !isset($PRODUCTS[$parts[0]], $VARIANTS[$parts[1]]) || $qty < 1 || $qty > 20) continue;
        $count += $qty;
        $lines[] = '• ' . h($PRODUCTS[$parts[0]]) . ' — ' . $VARIANTS[$parts[1]] . " × {$qty}";
    }
}

if (str_len($name) < 2 || strlen(preg_replace('/\D/', '', $phone)) < 10 || str_len($tgUser) < 2 || !$lines || $count > 50) {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'error' => 'invalid'], JSON_UNESCAPED_UNICODE));
}

$total = $price_for($count);
$full  = $count * $PRICE[1];
$ref   = 'RM' . date('ymdHis') . mt_rand(10, 99);

log_line('rozmalovky-orders.log', compact('ref', 'name', 'phone', 'tgUser', 'cart', 'count', 'total', 'utm'));

// Посилання на скрипт продажу з даними цього замовлення (operator.html)
$items = array();
foreach ($cart as $key => $qty) { $parts = explode(':', (string)$key); if (count($parts) === 2 && isset($PRODUCTS[$parts[0]], $VARIANTS[$parts[1]]) && (int)$qty > 0) $items[] = [$parts[0], $parts[1], (int)$qty]; }
$payload = rtrim(strtr(base64_encode(json_encode(['r' => $ref, 'n' => $name, 'p' => $phone, 't' => $tgUser, 'i' => $items, 's' => $total], JSON_UNESCAPED_UNICODE)), '+/', '-_'), '=');
// Для бота-продавця (tg-sales-bot.php): клієнт відкриває t.me/<бот>?start=<ref>
@mkdir(private_dir() . '/rm-orders', 0750, true);
@file_put_contents(private_dir() . "/rm-orders/{$ref}.json", json_encode(['ref' => $ref, 'name' => $name, 'phone' => $phone, 'tg' => $tgUser, 'items' => $items, 'total' => $total, 'ts' => date('c')], JSON_UNESCAPED_UNICODE), LOCK_EX);
$host = preg_replace('/[^a-z0-9.\-]/i', '', (string)g($_SERVER, 'HTTP_HOST', 'rozmalovky.noosal.shop'));
$scriptUrl = 'https://' . $host . '/operator.html?o=' . $payload;

tg("🖍️ <b>РОЗМАЛЬОВКИ — нове замовлення</b>\n"
 . implode("\n", $lines)
 . "\n\n📦 Разом: {$count} шт." . ($full > $total ? " (економія " . ($full - $total) . " грн)" : '')
 . "\n✅ <b>До сплати: {$total} грн</b> + доставка НП"
 . "\n\n👤 " . h($name) . "\n📞 " . h($phone)
 . "\n✈️ Telegram: " . ($tgNick ? '<a href="https://t.me/' . $tgNick . '">@' . h($tgNick) . '</a>' : h($tgUser))
 . "\n🚚 Доставку й оплату уточнити в Telegram або дзвінком"
 . "\n\n📋 <a href=\"" . h($scriptUrl) . "\">Відкрити скрипт продажу</a>" . "\n📊 " . h(utm_text($utm)) . "\n🧾 {$ref}");

echo json_encode(['ok' => true, 'ref' => $ref, 'total' => $total], JSON_UNESCAPED_UNICODE);
