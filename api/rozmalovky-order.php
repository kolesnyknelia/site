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
$city    = trim(str_cut((string)g($_POST, 'city'), 60));
$np      = trim(str_cut((string)g($_POST, 'np'), 60));
$comment = trim(str_cut((string)g($_POST, 'comment'), 300));
$prepay  = g($_POST, 'pay') === 'prepay';
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

if (str_len($name) < 2 || strlen(preg_replace('/\D/', '', $phone)) < 10 || str_len($city) < 2 || str_len($np) < 1 || !$lines || $count > 50) {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'error' => 'invalid'], JSON_UNESCAPED_UNICODE));
}

$total = $price_for($count);
$full  = $count * $PRICE[1];
$ref   = 'RM' . date('ymdHis') . mt_rand(10, 99);

log_line('rozmalovky-orders.log', compact('ref', 'name', 'phone', 'city', 'np', 'comment', 'prepay', 'cart', 'count', 'total', 'utm'));

tg("🖍️ <b>РОЗМАЛЬОВКИ — нове замовлення</b>\n"
 . implode("\n", $lines)
 . "\n\n📦 Разом: {$count} шт." . ($full > $total ? " (економія " . ($full - $total) . " грн)" : '')
 . "\n✅ <b>До сплати: {$total} грн</b> + доставка НП"
 . "\n💳 " . ($prepay ? 'Передоплата на картку' : 'Оплата при отриманні (наложка)')
 . "\n\n👤 " . h($name) . "\n📞 " . h($phone) . "\n📍 " . h($city) . ", НП " . h($np)
 . ($comment ? "\n💬 " . h($comment) : '')
 . "\n📊 " . h(utm_text($utm)) . "\n🧾 {$ref}");

echo json_encode(['ok' => true, 'ref' => $ref, 'total' => $total], JSON_UNESCAPED_UNICODE);
