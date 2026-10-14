<?php
/* WayForPay serviceUrl: перевірка підпису → доступ у SendPulse → повідомлення в Telegram → відповідь accept */
define('APP', 1);
require __DIR__ . '/lib.php';
$s = settings();

$raw = file_get_contents('php://input');
$d = json_decode($raw, true);
if (!is_array($d)) { $d = json_decode((string)array_key_first($_POST), true) ?: $_POST; } // деякі запити приходять як form-data
$ref = (string)($d['orderReference'] ?? '');

$expected = wfp_sign([
    $d['merchantAccount'] ?? '', $ref, $d['amount'] ?? '', $d['currency'] ?? '',
    $d['authCode'] ?? '', $d['cardPan'] ?? '', $d['transactionStatus'] ?? '', $d['reasonCode'] ?? '',
]);
if (!$ref || !hash_equals($expected, (string)($d['merchantSignature'] ?? ''))) {
    log_line('callbacks.log', ['ref' => $ref, 'error' => 'bad signature']);
    http_response_code(400); exit('bad signature');
}

$status = (string)$d['transactionStatus'];
log_line('callbacks.log', ['ref' => $ref, 'status' => $status, 'amount' => $d['amount'] ?? '', 'reason' => $d['reason'] ?? '']);
$o = order_get($ref);
$email = $o['email'] ?? strtolower((string)($d['email'] ?? ''));
$name  = $o['name'] ?? '';
$phone = $o['phone'] ?? (string)($d['phone'] ?? '');

if ($status === 'Approved' && empty($o['paid'])) {
    [$ok, $msg] = $email ? sendpulse_add($email, $name, $phone) : [false, 'немає email'];
    $o['paid'] = date('c'); $o['sendpulse'] = $ok ? 'ok' : $msg;
    order_put($ref, $o);
    $src = !empty($o['utm']) ? implode(' · ', array_map(fn($k, $v) => "$k=$v", array_keys($o['utm']), $o['utm'])) : 'прямий захід';
    tg("✅ <b>ОПЛАТА {$d['amount']} {$d['currency']}</b>\n"
     . "👤 " . h($name) . "\n📧 " . h($email) . "\n📞 " . h($phone ?: '—') . (!empty($o['contact']) ? "\n💬 " . h($o['contact']) : '')
     . "\n🎓 Доступ у SendPulse: " . ($ok ? 'відкрито ✅' : '❗ НЕ відкрито (' . h($msg) . ') — додайте вручну')
     . "\n📊 " . h($src) . "\n🧾 {$ref}");
} elseif (in_array($status, ['Declined', 'Expired'], true) && empty($o['notified_fail'])) {
    $o['notified_fail'] = 1; order_put($ref, $o);
    tg("❌ <b>Оплата не пройшла</b> ({$status}: " . h($d['reason'] ?? '') . ")\n👤 " . h($name) . "\n📧 " . h($email) . "\n📞 " . h($phone ?: '—') . "\n🧾 {$ref}\nМожна написати клієнту й допомогти оплатити.");
}

$time = time();
header('Content-Type: application/json');
echo json_encode(['orderReference' => $ref, 'status' => 'accept', 'time' => $time, 'signature' => wfp_sign([$ref, 'accept', $time])]);
