<?php
/* Спільні функції: налаштування, Telegram, SendPulse, підпис WayForPay, журнал замовлень */
if (!defined('APP')) { http_response_code(404); exit; }

function settings(): array {
    static $s = null;
    return $s ??= require __DIR__ . '/settings.php';
}

/** Секрети з /kvn.kiev.ua/private/config.php (поза публічною папкою www) */
function secret(string $key): string {
    static $c = null;
    if ($c === null) {
        $f = dirname(__DIR__, 2) . '/private/config.php';
        $c = is_file($f) ? (require $f) : [];
    }
    return (string)($c[$key] ?? '');
}

function private_dir(): string {
    $d = dirname(__DIR__, 2) . '/private';
    if (!is_dir($d)) @mkdir($d, 0750, true);
    return $d;
}

function log_line(string $file, array $data): void {
    $data['ts'] = date('c');
    @file_put_contents(private_dir() . '/' . $file, json_encode($data, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
}

function h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

/* ---------- Telegram ---------- */
function tg(string $html): bool {
    $token = secret('TG_BOT_TOKEN'); $chat = secret('TG_CHAT_ID');
    if (!$token || !$chat) return false;
    $ch = curl_init("https://api.telegram.org/bot{$token}/sendMessage");
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10,
        CURLOPT_POSTFIELDS => ['chat_id' => $chat, 'text' => $html, 'parse_mode' => 'HTML', 'disable_web_page_preview' => 'true'],
    ]);
    $ok = curl_exec($ch) !== false && curl_getinfo($ch, CURLINFO_HTTP_CODE) === 200;
    curl_close($ch);
    return $ok;
}

/* ---------- WayForPay: підпис HMAC-MD5 ---------- */
function wfp_sign(array $parts): string {
    return hash_hmac('md5', implode(';', $parts), secret('WFP_SECRET'));
}

/* ---------- SendPulse: додати email в адресну книгу (звідти автоматизація відкриває курс) ---------- */
function sendpulse_token(): string {
    $id = secret('SP_CLIENT_ID'); $sec = secret('SP_CLIENT_SECRET');
    if (!$id || !$sec) return '';
    $ch = curl_init('https://api.sendpulse.com/oauth/access_token');
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['grant_type' => 'client_credentials', 'client_id' => $id, 'client_secret' => $sec]),
    ]);
    $r = json_decode((string)curl_exec($ch), true);
    curl_close($ch);
    return (string)($r['access_token'] ?? '');
}

function sendpulse_add(string $email, string $name, string $phone): array {
    $book = secret('SP_BOOK_ID');
    $token = sendpulse_token();
    if (!$book || !$token) return [false, 'SendPulse не налаштовано'];
    $payload = ['emails' => [['email' => $email, 'variables' => array_filter(['name' => $name, 'phone' => $phone])]]];
    $ch = curl_init("https://api.sendpulse.com/addressbooks/{$book}/emails");
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', "Authorization: Bearer {$token}"],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ]);
    $body = (string)curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $r = json_decode($body, true);
    return [$code === 200 && !empty($r['result']), $code === 200 ? 'ok' : "HTTP {$code}"];
}

/* Деталі замовлення, збережені під час оформлення (ім'я, телефон, UTM) */
function order_get(string $ref): array {
    $f = private_dir() . '/orders/' . preg_replace('/[^A-Za-z0-9_-]/', '', $ref) . '.json';
    return is_file($f) ? (json_decode((string)file_get_contents($f), true) ?: []) : [];
}
function order_put(string $ref, array $data): void {
    $d = private_dir() . '/orders';
    if (!is_dir($d)) @mkdir($d, 0750, true);
    @file_put_contents($d . '/' . preg_replace('/[^A-Za-z0-9_-]/', '', $ref) . '.json', json_encode($data, JSON_UNESCAPED_UNICODE), LOCK_EX);
}
