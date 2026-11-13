<?php
/* Заявка з rozmalovkitop.noosal.shop → Telegram + LP-CRM (товар 147).
   Ключі — у /noosal.shop/private/config.php (TG_BOT_TOKEN, TG_CHAT_ID, LPCRM_*), той самий файл, що для інших сайтів noosal.shop.
   Ціни мають збігатися з js/config.js: суму рахує сервер, з браузера її не беремо. */
define('APP', 1);
require __DIR__ . '/lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out($code, $data) { http_response_code($code); echo json_encode($data, JSON_UNESCAPED_UNICODE); exit; }

$PRODUCT    = 'Розмальовка «Зима міленіалів»';
$PRICE      = 290;
$DISCOUNT2  = 0;
$CRM_ID     = '147';
$EXTRAS = [
    'markers'   => ['Акрилові маркери, 24 кольори', 320],
    'pencils'   => ['Кольорові олівці, 24 кольори', 140],
    'multyky'   => ['Розмальовка «Мультики дитинства»', 249],
    'christmas' => ['Розмальовка «Merry Christmas»', 249],
    'selo'      => ['Розмальовка «Зима в українському селі»', 249],
    'grinch'    => ['Розмальовка «Грінч»', 249],
    'potter'    => ['Розмальовка «Гаррі Поттер»', 249],
    'zhyttia'   => ['Розмальовка «Розмальовка нашого життя»', 249],
    'dytynstvo' => ['Розмальовка «Назад у дитинство»', 249],
    '90'        => ['Розмальовка «Назад у 90-ті»', 249],
];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') out(405, ['ok' => false]);

$in = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($in)) $in = $_POST;

// Пастка для ботів: поле website людина не бачить і не заповнює
if (!empty($in['website'])) out(200, ['ok' => true, 'ref' => 'X' . time(), 'total' => 0]);

$name    = trim(str_cut(strip_tags((string)g($in, 'name')), 60));
$phone   = '+' . preg_replace('/\D/', '', (string)g($in, 'phone'));
$qty     = (int)g($in, 'qty', 1) === 2 ? 2 : 1;
$version = trim(str_cut(strip_tags((string)g($in, 'version')), 40));
$utm     = is_array(g($in, 'utm', null)) ? array_slice($in['utm'], 0, 8) : [];
foreach ($utm as $k => $v) $utm[$k] = str_cut((string)$v, 120);

$digits = strlen($phone) - 1;
if (str_len($name) < 2 || $digits < 10 || $digits > 15) out(400, ['ok' => false, 'error' => 'invalid']);

$extras = [];
foreach ((array)g($in, 'extras', []) as $id) {
    $id = (string)$id;
    if (isset($EXTRAS[$id]) && !isset($extras[$id])) $extras[$id] = $EXTRAS[$id];
}
$base  = $qty === 2 ? 2 * $PRICE - $DISCOUNT2 : $PRICE;
$total = $base;
foreach ($extras as $e) $total += $e[1];
$ref  = date('ymd-His') . '-' . mt_rand(10, 99);
$host = preg_replace('/[^a-z0-9.\-]/i', '', (string)g($_SERVER, 'HTTP_HOST', 'rozmalovkitop.noosal.shop'));

$lines = ["• {$PRODUCT}" . ($version !== '' ? " ({$version})" : '') . " × {$qty} — {$base} грн"];
foreach ($extras as $e) $lines[] = "• {$e[0]} — {$e[1]} грн";

log_line('rozmalovkitop-orders.log', compact('ref', 'name', 'phone', 'qty', 'version', 'extras', 'total', 'utm'));

/* ---------- LP-CRM ---------- */
$crm = '';
if (secret('LPCRM_DOMAIN') !== '' && secret('LPCRM_KEY') !== '') {
    $data = [
        'key'        => secret('LPCRM_KEY'),
        'order_id'   => number_format(round(microtime(true) * 10), 0, '.', ''),
        'country'    => 'UA',
        'products'   => urlencode(serialize([[
            'product_id' => $CRM_ID,
            'price'      => (string)round($total / $qty, 2),
            'count'      => (string)$qty,
        ]])),
        'bayer_name' => $name,
        'phone'      => $phone,
        'comment'    => implode('; ', $lines) . " · Разом {$total} грн · {$ref}",
        'site'       => $host,
        'ip'         => (string)g($_SERVER, 'REMOTE_ADDR'),
    ];
    if (secret('LPCRM_OFFICE') !== '') $data['office'] = secret('LPCRM_OFFICE');
    if (secret('LPCRM_PAYMENT') !== '') $data['payment'] = secret('LPCRM_PAYMENT');
    foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as $k) {
        if (isset($utm[$k])) $data[$k] = str_cut($utm[$k], 100);
    }
    $ch = curl_init('https://' . preg_replace('~^https?://|/.*$~', '', secret('LPCRM_DOMAIN')) . '/api/addNewOrder.html');
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12, CURLOPT_POSTFIELDS => http_build_query($data)]);
    $r = json_decode((string)curl_exec($ch), true);
    curl_close($ch);
    $crm = (is_array($r) && g($r, 'status') === 'ok') ? '✅ передано в LP-CRM' : '⚠️ LP-CRM не прийняла заявку — внесіть вручну';
}

/* ---------- Telegram ---------- */
$tgOk = tg("❄️ <b>ЗИМА МІЛЕНІАЛІВ — нова заявка</b>\n\n"
    . h(implode("\n", $lines))
    . "\n\n💰 <b>Разом: {$total} грн</b> + доставка НП"
    . "\n\n👤 " . h($name) . "\n📞 " . h($phone)
    . "\n\n📊 " . h(utm_text($utm))
    . "\n🌐 " . h($host) . " · 🧾 {$ref}"
    . ($crm ? "\n" . $crm : ''));

if (!$tgOk && strpos($crm, '✅') !== 0) out(502, ['ok' => false, 'error' => 'send']);
out(200, ['ok' => true, 'ref' => $ref, 'total' => $total]);
