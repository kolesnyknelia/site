<?php
/* Оформлення замовлення: форма з сайту → Telegram (новий лід) → перехід на оплату WayForPay */
define('APP', 1);
require __DIR__ . '/lib.php';
$s = settings();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Location: /#pricing'); exit; }

$name    = trim(mb_substr((string)($_POST['name'] ?? ''), 0, 80));
$email   = strtolower(trim(mb_substr((string)($_POST['email'] ?? ''), 0, 120)));
$phone   = preg_replace('/[^\d+]/', '', (string)($_POST['phone'] ?? ''));
$contact = trim(mb_substr((string)($_POST['contact'] ?? ''), 0, 80));
$utm     = json_decode((string)($_POST['utm'] ?? '{}'), true) ?: [];
$utm     = array_map(fn($v) => mb_substr((string)$v, 0, 120), array_slice($utm, 0, 8));

if (mb_strlen($name) < 2 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    exit('Будь ласка, поверніться і вкажіть ім\'я та коректний email.');
}

$ref  = 'KVN' . date('ymdHis') . random_int(100, 999);
$date = time();
$amount = $s['price'];
order_put($ref, compact('name', 'email', 'phone', 'contact', 'utm', 'amount') + ['created' => date('c'), 'paid' => false]);
log_line('leads.log', ['ref' => $ref, 'name' => $name, 'email' => $email, 'phone' => $phone, 'utm' => $utm]);

$src = $utm ? implode(' · ', array_map(fn($k, $v) => "$k=$v", array_keys($utm), $utm)) : 'прямий захід';
tg("🟡 <b>Новий лід — перейшов до оплати</b>\n"
 . "👤 " . h($name) . "\n📧 " . h($email) . "\n📞 " . h($phone ?: '—') . ($contact ? "\n💬 " . h($contact) : '')
 . "\n💵 {$amount} {$s['currency']}\n📊 " . h($src) . "\n🧾 {$ref}");

$merchant = secret('WFP_MERCHANT');
if (!$merchant || !secret('WFP_SECRET')) {
    // Оплату ще не підключено — показуємо подяку, заявка вже у Telegram
    header('Location: return.php?ref=' . urlencode($ref) . '&manual=1'); exit;
}

$fields = [
    'merchantAccount'    => $merchant,
    'merchantAuthType'   => 'SimpleSignature',
    'merchantDomainName' => $s['domain'],
    'orderReference'     => $ref,
    'orderDate'          => $date,
    'amount'             => $amount,
    'currency'           => $s['currency'],
    'productName[]'      => $s['product_name'],
    'productCount[]'     => 1,
    'productPrice[]'     => $amount,
    'clientFirstName'    => $name,
    'clientEmail'        => $email,
    'clientPhone'        => $phone,
    'language'           => $s['language'],
    'returnUrl'          => $s['site_url'] . '/api/return.php?ref=' . $ref,
    'serviceUrl'         => $s['site_url'] . '/api/wfp-callback.php',
];
// Порядок полів підпису за протоколом WayForPay
$fields['merchantSignature'] = wfp_sign([$merchant, $s['domain'], $ref, $date, $amount, $s['currency'], $s['product_name'], 1, $amount]);
?><!doctype html>
<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Переходимо до оплати…</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f3ec;font-family:system-ui,sans-serif;color:#23302a;text-align:center}button{background:#4f6e60;color:#fff;border:0;border-radius:99px;padding:16px 28px;font-size:16px;font-weight:700;margin-top:14px;cursor:pointer}</style>
</head><body>
<form id="pay" method="post" action="https://secure.wayforpay.com/pay" accept-charset="utf-8">
<?php foreach ($fields as $k => $v): ?>  <input type="hidden" name="<?= h($k) ?>" value="<?= h((string)$v) ?>">
<?php endforeach; ?>
  <p>🌿 Переходимо на захищену сторінку оплати WayForPay…</p>
  <button type="submit">Перейти до оплати</button>
</form>
<script>document.getElementById('pay').submit();</script>
</body></html>
