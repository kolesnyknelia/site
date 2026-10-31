<?php
/* Спільні функції: налаштування, Telegram, SendPulse, підпис WayForPay, журнал замовлень */
if (!defined('APP')) { http_response_code(404); exit; }

function settings() {
    static $s = null;
    if ($s === null) $s = require __DIR__ . '/settings.php';
    return $s;
}

function mb_substr_safe($s, $n) { return str_cut($s, $n); }
function str_cut($s, $n) { return function_exists('mb_substr') ? mb_substr($s, 0, $n, 'UTF-8') : substr($s, 0, $n); }
function str_len($s) { return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s); }
function utm_text($utm) {
    if (!$utm) return 'прямий захід';
    $out = array();
    foreach ($utm as $k => $v) $out[] = "$k=$v";
    return implode(' · ', $out);
}

/** Секрети з /kvn.kiev.ua/private/config.php (поза публічною папкою www) */
function secret($key) {
    static $c = null;
    if ($c === null) {
        $f = dirname(dirname(__DIR__)) . '/private/config.php';
        $c = is_file($f) ? (require $f) : array();
    }
    return isset($c[$key]) ? (string)$c[$key] : '';
}

function private_dir() {
    $d = dirname(dirname(__DIR__)) . '/private';
    if (!is_dir($d)) @mkdir($d, 0750, true);
    return $d;
}

function log_line($file, $data) {
    $data['ts'] = date('c');
    @file_put_contents(private_dir() . '/' . $file, json_encode($data, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
}

function g($a, $k, $d = '') { return isset($a[$k]) ? $a[$k] : $d; }

function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

/* ---------- Telegram ---------- */
function tg($html) {
    log_line('tg.log', array('text' => mb_substr_safe(strip_tags($html), 300)));
    $token = secret('TG_BOT_TOKEN'); $chat = secret('TG_CHAT_ID');
    if (!$token || !$chat) return false;
    $ch = curl_init("https://api.telegram.org/bot{$token}/sendMessage");
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10,
        CURLOPT_POSTFIELDS => array('chat_id' => $chat, 'text' => $html, 'parse_mode' => 'HTML', 'disable_web_page_preview' => 'true'),
    ]);
    $ok = curl_exec($ch) !== false && curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200;
    curl_close($ch);
    return $ok;
}

/* ---------- WayForPay: підпис HMAC-MD5 ---------- */
function wfp_sign($parts) {
    return hash_hmac('md5', implode(';', $parts), secret('WFP_SECRET'));
}

/* ---------- SendPulse: додати email в адресну книгу (звідти автоматизація відкриває курс) ---------- */
function sp_base() {
    $b = secret('SP_API_BASE'); // лише для локальних тестів; на сайті порожньо
    return $b ? rtrim($b, '/') : 'https://api.sendpulse.com';
}

function sp_request($url, $payload, $token = '') {
    $h = array('Content-Type: application/json');
    if ($token) $h[] = "Authorization: Bearer {$token}";
    $ch = curl_init($url);
    curl_setopt_array($ch, array(
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15, CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_HTTPHEADER => $h, CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ));
    $body = curl_exec($ch);
    $err = $body === false ? curl_error($ch) : '';
    $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return array($code, json_decode((string)$body, true), $err);
}

/** [токен, помилка] */
function sendpulse_token() {
    $id = secret('SP_CLIENT_ID'); $sec = secret('SP_CLIENT_SECRET');
    if (!$id || !$sec) return array('', 'SendPulse не налаштовано (немає ключів API)');
    list($code, $r, $err) = sp_request(sp_base() . '/oauth/access_token',
        array('grant_type' => 'client_credentials', 'client_id' => $id, 'client_secret' => $sec));
    if (!empty($r['access_token'])) return array((string)$r['access_token'], '');
    return array('', $err ? "з'єднання: {$err}" : "вхід в API: HTTP {$code}");
}

/** Додає email в адресну книгу (звідти Automation 360 відкриває курс). [успіх, причина] */
function sendpulse_add($email, $name, $phone, $book = '', $vars = array()) {
    // $book — інша адресна книга (напр. «Формула Claude» з її settings.php); порожньо — книга курсу kvn.kiev.ua
    if (!$book) $book = secret('SP_BOOK_ID');
    if (!$book) return array(false, 'SendPulse не налаштовано (немає номера книги)');
    list($token, $terr) = sendpulse_token();
    if (!$token) return array(false, $terr);
    $payload = array('emails' => array(array('email' => $email, 'variables' => array_filter(array('name' => $name, 'phone' => $phone) + $vars))));
    list($code, $r, $err) = sp_request(sp_base() . "/addressbooks/{$book}/emails", $payload, $token);
    if ($code === 200 && !empty($r['result'])) return array(true, 'ok');
    if ($err) return array(false, "з'єднання: {$err}");
    $why = is_array($r) ? (isset($r['message']) ? $r['message'] : (isset($r['error']) ? $r['error'] : '')) : '';
    return array(false, "HTTP {$code}" . ($why ? " ({$why})" : ''));
}

/** Блокування замовлення, щоб два повтори WayForPay не обробили його одночасно */
function order_lock($ref) {
    $d = private_dir() . '/orders';
    if (!is_dir($d)) @mkdir($d, 0750, true);
    $fh = @fopen($d . '/' . preg_replace('/[^A-Za-z0-9_-]/', '', $ref) . '.lock', 'c');
    if ($fh) flock($fh, LOCK_EX);
    return $fh;
}

/* Деталі замовлення, збережені під час оформлення (ім'я, телефон, UTM) */
function order_get($ref) {
    $f = private_dir() . '/orders/' . preg_replace('/[^A-Za-z0-9_-]/', '', $ref) . '.json';
    $d = is_file($f) ? json_decode((string)file_get_contents($f), true) : null;
    return is_array($d) ? $d : array();
}
function order_put($ref, $data) {
    $d = private_dir() . '/orders';
    if (!is_dir($d)) @mkdir($d, 0750, true);
    @file_put_contents($d . '/' . preg_replace('/[^A-Za-z0-9_-]/', '', $ref) . '.json', json_encode($data, JSON_UNESCAPED_UNICODE), LOCK_EX);
}
