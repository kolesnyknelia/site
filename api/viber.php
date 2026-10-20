<?php
/* Viber Bot API (chatapi.viber.com): надсилання повідомлень і клавіатур. Токен — VIBER_BOT_TOKEN у приватному конфігу */
if (!defined('APP')) { http_response_code(404); exit; }

function viber_api($method, $params) {
    $token = secret('VIBER_BOT_TOKEN');
    if (!$token) return null;
    $base = secret('VIBER_API_BASE') ?: 'https://chatapi.viber.com'; // лише для локальних тестів
    $ch = curl_init(rtrim($base, '/') . '/pa/' . $method);
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'X-Viber-Auth-Token: ' . $token],
        CURLOPT_POSTFIELDS => json_encode($params, JSON_UNESCAPED_UNICODE),
    ]);
    $r = json_decode((string)curl_exec($ch), true);
    curl_close($ch);
    if (!is_array($r) || (int)g($r, 'status', -1) !== 0) log_line('viber-bot.log', ['method' => $method, 'error' => is_array($r) ? g($r, 'status_message', '') : 'no response']);
    return $r;
}

/** Клавіатура внизу чату: [[підпис, значення], …] — кожна кнопка на всю ширину */
function viber_keyboard($buttons) {
    $out = [];
    foreach ($buttons as $b) $out[] = [
        'Columns' => 6, 'Rows' => 1, 'ActionType' => 'reply', 'ActionBody' => $b[1], 'Silent' => true,
        'Text' => '<font color="#ffffff"><b>' . htmlspecialchars($b[0], ENT_QUOTES, 'UTF-8') . '</b></font>',
        'BgColor' => strpos($b[1], 'v:premium') === 0 || $b[1] === 'go' || $b[1] === 'ok' || $b[1] === 'pay:fop' ? '#ec6f55' : '#8a7f7a',
        'TextSize' => 'regular',
    ];
    return ['Type' => 'keyboard', 'DefaultHeight' => false, 'Buttons' => $out];
}

function viber_message($to, $type, $fields, $buttons = null) {
    $p = ['receiver' => $to, 'type' => $type, 'min_api_version' => 3, 'sender' => ['name' => 'Розмалюй момент']] + $fields;
    if ($buttons) $p['keyboard'] = viber_keyboard($buttons);
    return viber_api('send_message', $p);
}
function viber_text($to, $text, $buttons = null) { return viber_message($to, 'text', ['text' => $text], $buttons); }
function viber_picture($to, $url, $caption = '', $buttons = null) { return viber_message($to, 'picture', ['media' => $url, 'text' => $caption], $buttons); }
