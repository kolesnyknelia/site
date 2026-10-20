<?php
/* Заявка з сайту → Telegram-група (+ LP-CRM, якщо налаштована). Для хостингу Україна (PHP).
   Тут нічого міняти не треба: товар, ціни й ключі — в api/config.php */
define('APP', 1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$C = require __DIR__ . '/config.php';

function out($code, $data) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }
function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function cut($s, $n) { return function_exists('mb_substr') ? mb_substr((string)$s, 0, $n, 'UTF-8') : substr((string)$s, 0, $n); }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['ok' => false]);

$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;

// Пастка для ботів: поле website людина не бачить і не заповнює
if (!empty($in['website'])) out(200, ['ok' => true, 'ref' => 'X' . time(), 'total' => 0]);

$name  = trim(cut(strip_tags((string)($in['name'] ?? '')), 60));
$phone = '+' . preg_replace('/\D/', '', (string)($in['phone'] ?? ''));
$qty   = (int)($in['qty'] ?? 1) === 2 ? 2 : 1;
$utm   = is_array($in['utm'] ?? null) ? array_slice($in['utm'], 0, 8) : [];

$digits = strlen($phone) - 1;
if ((function_exists('mb_strlen') ? mb_strlen($name, 'UTF-8') : strlen($name)) < 2 || $digits < 10 || $digits > 15) {
    out(400, ['ok' => false, 'error' => 'invalid']);
}

$price = (int)$C['price'];
$total = $qty === 2 ? 2 * $price - (int)$C['discount2'] : $price;
$ref   = date('ymd-His') . '-' . mt_rand(10, 99);
$host  = preg_replace('/[^a-z0-9.\-]/i', '', (string)($_SERVER['HTTP_HOST'] ?? ''));

$utmText = [];
foreach ($utm as $k => $v) $utmText[] = preg_replace('/[^\w]/', '', (string)$k) . '=' . cut($v, 100);

/* ---------- LP-CRM ---------- */
$crm = '';
if (!empty($C['lpcrm_domain']) && !empty($C['lpcrm_key'])) {
    $products = urlencode(serialize([[
        'product_id' => (string)$C['lpcrm_product_id'],
        'price'      => (string)round($total / $qty, 2),
        'count'      => (string)$qty,
    ]]));
    $data = [
        'key'        => $C['lpcrm_key'],
        'order_id'   => number_format(round(microtime(true) * 10), 0, '.', ''),
        'country'    => 'UA',
        'products'   => $products,
        'bayer_name' => $name,
        'phone'      => $phone,
        'comment'    => $C['product'] . ' × ' . $qty . ' = ' . $total . ' грн · ' . $ref,
        'site'       => $host,
        'ip'         => (string)($_SERVER['REMOTE_ADDR'] ?? ''),
    ];
    if (!empty($C['lpcrm_office'])) $data['office'] = (string)$C['lpcrm_office'];
    foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as $k) {
        if (isset($utm[$k])) $data[$k] = cut($utm[$k], 100);
    }
    $domain = preg_replace('~^https?://|/.*$~', '', $C['lpcrm_domain']);
    $ch = curl_init('https://' . $domain . '/api/addNewOrder.html');
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12, CURLOPT_POSTFIELDS => http_build_query($data)]);
    $r = json_decode((string)curl_exec($ch), true);
    curl_close($ch);
    $crm = (is_array($r) && ($r['status'] ?? '') === 'ok') ? '✅ передано в LP-CRM' : '⚠️ LP-CRM не прийняла заявку — внесіть вручну';
}

/* ---------- Telegram ---------- */
$text = "🛒 <b>НОВА ЗАЯВКА — " . h($C['shop']) . "</b>\n\n"
      . "📦 " . h($C['product']) . "\n"
      . "🔢 Кількість: <b>{$qty} шт</b>\n"
      . "💰 Сума: <b>{$total} грн</b> + доставка\n\n"
      . "👤 " . h($name) . "\n"
      . "📞 " . h($phone) . "\n\n"
      . "📊 " . h($utmText ? implode(' · ', $utmText) : 'прямий захід') . "\n"
      . "🌐 " . h($host) . " · 🧾 {$ref}"
      . ($crm ? "\n" . $crm : '');

$tgOk = false;
if (!empty($C['tg_token']) && !empty($C['tg_chat'])) {
    $ch = curl_init('https://api.telegram.org/bot' . $C['tg_token'] . '/sendMessage');
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10,
        CURLOPT_POSTFIELDS => ['chat_id' => $C['tg_chat'], 'text' => $text, 'parse_mode' => 'HTML', 'disable_web_page_preview' => 'true'],
    ]);
    $tgOk = curl_exec($ch) !== false && curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200;
    curl_close($ch);
}

if (!$tgOk && strpos($crm, '✅') !== 0) out(502, ['ok' => false, 'error' => 'send']);
out(200, ['ok' => true, 'ref' => $ref, 'total' => $total]);
