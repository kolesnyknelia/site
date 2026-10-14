<?php
/* WayForPay serviceUrl: перевірка підпису → доступ у SendPulse → повідомлення в Telegram → відповідь accept */
define('APP', 1);
require __DIR__ . '/lib.php';
$s = settings();

$raw = file_get_contents('php://input');
$d = json_decode($raw, true);
if (!is_array($d)) { $keys = array_keys($_POST); $d = $keys ? json_decode((string)$keys[0], true) : null; if (!is_array($d)) $d = $_POST; } // деякі запити приходять як form-data
$ref = (string)g($d, 'orderReference');

$expected = wfp_sign(array(
    g($d, 'merchantAccount'), $ref, g($d, 'amount'), g($d, 'currency'),
    g($d, 'authCode'), g($d, 'cardPan'), g($d, 'transactionStatus'), g($d, 'reasonCode'),
));
if (!$ref || !hash_equals($expected, (string)g($d, 'merchantSignature'))) {
    log_line('callbacks.log', ['ref' => $ref, 'error' => 'bad signature']);
    http_response_code(400); exit('bad signature');
}

$status = (string)$d['transactionStatus'];
log_line('callbacks.log', ['ref' => $ref, 'status' => $status, 'amount' => g($d, 'amount'), 'reason' => g($d, 'reason')]);
$o = order_get($ref);
$email = g($o, 'email', strtolower((string)g($d, 'email')));
$name  = g($o, 'name');
$phone = g($o, 'phone', (string)g($d, 'phone'));

if ($status === 'Approved' && empty($o['paid'])) {
    list($ok, $msg) = $email ? sendpulse_add($email, $name, $phone) : array(false, 'немає email');
    $o['paid'] = date('c'); $o['sendpulse'] = $ok ? 'ok' : $msg;
    order_put($ref, $o);
    $src = utm_text(g($o, 'utm', array()));
    tg("🎓 <b>КУРС kvn.kiev.ua</b>\n✅ <b>ОПЛАТА {$d['amount']} {$d['currency']}</b>\n"
     . "👤 " . h($name) . "\n📧 " . h($email) . "\n📞 " . h($phone ?: '—') . (!empty($o['contact']) ? "\n💬 " . h($o['contact']) : '')
     . "\n🎓 Доступ у SendPulse: " . ($ok ? 'відкрито ✅' : '❗ НЕ відкрито (' . h($msg) . ') — додайте вручну')
     . "\n📊 " . h($src) . "\n🧾 {$ref}");
} elseif (in_array($status, ['Declined', 'Expired'], true) && empty($o['notified_fail'])) {
    $o['notified_fail'] = 1; order_put($ref, $o);
    tg("🎓 <b>КУРС kvn.kiev.ua</b>\n❌ <b>Оплата не пройшла</b> ({$status}: " . h(g($d, 'reason')) . ")\n👤 " . h($name) . "\n📧 " . h($email) . "\n📞 " . h($phone ?: '—') . "\n🧾 {$ref}\nМожна написати клієнту й допомогти оплатити.");
}

$time = time();
header('Content-Type: application/json');
echo json_encode(['orderReference' => $ref, 'status' => 'accept', 'time' => $time, 'signature' => wfp_sign([$ref, 'accept', $time])]);
