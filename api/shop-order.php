<?php
/* Замовлення з магазину «Тямко» (/shop/) → Telegram. Оплата: передоплата або при отриманні */
define('APP', 1);
require __DIR__ . '/lib.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit(json_encode(['ok' => false])); }

// Ціни рахує сервер (ті самі, що в shop/shop.js) — суму з браузера не беремо
$PRICES = [
    'papka'             => ['Велика розвивальна папка', 990],
    'den'               => ['Мій день і мої емоції', 590],
    'nalipky:tvaryny'   => ['Наліпки за номерами — Тварини України', 249],
    'nalipky:karpaty'   => ['Наліпки за номерами — Карпати', 249],
    'nalipky:svyata'    => ['Наліпки за номерами — Наші свята', 249],
    'nalipky:seriya'    => ['Наліпки за номерами — усі 3 книги', 649],
    'mistechko'         => ['Паперове містечко', 249],
    'znaydy'            => ['Знайди і покажи з Тямком', 299],
    'b:vse'             => ['Комплект «Все разом»', 2190],
    'b:zyma'            => ['Комплект «Зимовий подарунок»', 1149],
    'b:pershyi'         => ['Комплект «Перший набір»', 649],
];
$PREPAY_DISCOUNT = 0.05;
$FREE_SHIP_FROM  = 1000;

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

$lines = array(); $sum = 0;
if (is_array($cart)) {
    foreach ($cart as $key => $qty) {
        $qty = (int)$qty;
        if (!isset($PRICES[$key]) || $qty < 1 || $qty > 20) continue;
        list($title, $price) = $PRICES[$key];
        $sum += $price * $qty;
        $lines[] = "• " . h($title) . " × {$qty} = " . ($price * $qty) . " грн";
    }
}

if (str_len($name) < 2 || strlen(preg_replace('/\D/', '', $phone)) < 10 || str_len($city) < 2 || str_len($np) < 1 || !$lines) {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'error' => 'invalid'], JSON_UNESCAPED_UNICODE));
}

$disc  = $prepay ? (int)round($sum * $PREPAY_DISCOUNT) : 0;
$total = $sum - $disc;
$ref   = 'TM' . date('ymdHis') . mt_rand(10, 99);

log_line('shop-orders.log', compact('ref', 'name', 'phone', 'city', 'np', 'comment', 'prepay', 'cart', 'sum', 'disc', 'total', 'utm'));

tg("🦉 <b>ТЯМКО — нове замовлення</b>\n"
 . implode("\n", $lines)
 . "\n\n💰 Товари: {$sum} грн" . ($disc ? "\n🔻 Передоплата −5%: −{$disc} грн" : '')
 . "\n✅ <b>Разом: {$total} грн</b>"
 . "\n💳 " . ($prepay ? 'Передоплата на картку' : 'Оплата при отриманні (наложка)')
 . "\n🚚 " . ($sum >= $FREE_SHIP_FROM ? 'Доставка безкоштовна' : 'Доставка за тарифом НП')
 . "\n\n👤 " . h($name) . "\n📞 " . h($phone) . "\n📍 " . h($city) . ", НП " . h($np)
 . ($comment ? "\n💬 " . h($comment) : '')
 . "\n📊 " . h(utm_text($utm)) . "\n🧾 {$ref}");

echo json_encode(['ok' => true, 'ref' => $ref, 'total' => $total], JSON_UNESCAPED_UNICODE);
