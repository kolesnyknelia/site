<?php
/* «Формула Claude»: форма покупки → Telegram (новий лід) → оплата WayForPay.
   На хостинг потрапляє як formulaclaude/api/order.php. */
define('APP', 1);
require __DIR__ . '/lib.php';
$s = settings();
$HEAD = "✳️ <b>ФОРМУЛА CLAUDE</b>\n";

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Location: /#packs'); exit; }
if (trim((string)g($_POST, 'website')) !== '') { header('Location: /'); exit; } // бот заповнив приховане поле

$name    = trim(str_cut(strip_tags((string)g($_POST, 'name')), 80));
$email   = strtolower(trim(str_cut((string)g($_POST, 'email'), 120)));
$phone   = preg_replace('/[^\d+]/', '', (string)g($_POST, 'phone'));
$contact = trim(str_cut(strip_tags((string)g($_POST, 'contact')), 80));
$pack    = (string)g($_POST, 'pack');
$utm     = json_decode((string)g($_POST, 'utm', '{}'), true);
$utm     = is_array($utm) ? array_slice($utm, 0, 8) : array();
foreach ($utm as $k => $v) $utm[$k] = str_cut((string)$v, 120);

$packs = $s['packs'];
if (!isset($packs[$pack])) { http_response_code(400); exit('Оберіть пакет на сайті й спробуйте ще раз.'); }
if (str_len($name) < 2 || !filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/@gmail\.com$/', $email)) {
    http_response_code(400);
    exit('Будь ласка, поверніться і вкажіть ім\'я та пошту Gmail (…@gmail.com) — доступ до уроків працює тільки з нею.');
}

$packName = $packs[$pack]['name'];
$amount   = $packs[$pack]['price'];
$currency = $s['currency'];
$product  = $s['product_name'] . ' — ' . $packName;
$ref  = 'FC' . date('ymdHis') . mt_rand(100, 999);
$date = time();

order_put($ref, compact('name', 'email', 'phone', 'contact', 'pack', 'utm', 'amount', 'currency') + ['site' => 'formulaclaude', 'created' => date('c'), 'paid' => false]);
log_line('formulaclaude-leads.log', ['ref' => $ref, 'name' => $name, 'email' => $email, 'phone' => $phone, 'pack' => $pack, 'utm' => $utm]);

tg($HEAD . "🟡 <b>Новий лід — перейшов до оплати</b>\n"
 . "👤 " . h($name) . "\n📧 " . h($email) . "\n📞 " . h($phone ?: '—') . ($contact ? "\n💬 " . h($contact) : '')
 . "\n🎫 Пакет: <b>" . h($packName) . "</b> · {$amount} {$currency}\n📊 " . h(utm_text($utm)) . "\n🧾 {$ref}");

$merchant = secret('WFP_MERCHANT') ?: (string)g($s, 'wfp_merchant');
if (!$merchant || !secret('WFP_SECRET')) {
    header('Location: return.php?ref=' . urlencode($ref) . '&manual=1'); exit;
}

$fields = [
    'merchantAccount'    => $merchant,
    'merchantAuthType'   => 'SimpleSignature',
    'merchantDomainName' => $s['domain'],
    'orderReference'     => $ref,
    'orderDate'          => $date,
    'amount'             => $amount,
    'currency'           => $currency,
    'productName[]'      => $product,
    'productCount[]'     => 1,
    'productPrice[]'     => $amount,
    'clientFirstName'    => $name,
    'clientEmail'        => $email,
    'clientPhone'        => $phone,
    'language'           => $s['language'],
    'returnUrl'          => $s['site_url'] . '/api/return.php?ref=' . $ref,
    'serviceUrl'         => $s['site_url'] . '/api/wfp-callback.php',
];
$fields['merchantSignature'] = wfp_sign([$merchant, $s['domain'], $ref, $date, $amount, $currency, $product, 1, $amount]);
?><!doctype html>
<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Переходимо до оплати…</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f0f0ef;font-family:Inter,system-ui,sans-serif;color:#1f1f1f;text-align:center;padding:16px}button{background:none;color:#1f1f1f;border:1px solid #3a3a3a;padding:14px 28px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;margin-top:14px;cursor:pointer}</style>
</head><body>
<form id="pay" method="post" action="https://secure.wayforpay.com/pay" accept-charset="utf-8">
<?php foreach ($fields as $k => $v): ?>  <input type="hidden" name="<?= h($k) ?>" value="<?= h((string)$v) ?>">
<?php endforeach; ?>
  <p>✳️ Переходимо на захищену сторінку оплати WayForPay…</p>
  <button type="submit">Перейти до оплати</button>
</form>
<script>document.getElementById('pay').submit();</script>
</body></html>
