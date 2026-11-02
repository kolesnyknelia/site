<?php
/* Viber-бот «Недозвон» (webhook). Клієнт приходить за посиланням viber://pa?chatURI=…&context=o<id>_<підпис> */
define('NZ', 1);
require __DIR__ . '/lib.php';
if (!K('VIBER_TOKEN')) { http_response_code(404); exit; }
$body = (string)file_get_contents('php://input');
// Підпис Viber: HMAC-SHA256 тіла запиту ключем бота
if (!hash_equals(hash_hmac('sha256', $body, K('VIBER_TOKEN')), (string)g($_SERVER, 'HTTP_X_VIBER_CONTENT_SIGNATURE'))) { http_response_code(403); exit; }
$u = json_decode($body, true);
if (!is_array($u)) exit;
$ev = g($u, 'event');

if ($ev === 'conversation_started') {
    // Тут Viber дозволяє лише одне вітальне повідомлення — у відповіді на запит
    $user = g($u, 'user', []);
    $GLOBALS['NZ_OUT'] = [];
    flow_start('vb:' . g($user, 'id'), (string)g($u, 'context'));
    $out = $GLOBALS['NZ_OUT']; unset($GLOBALS['NZ_OUT']);
    if (!$out) exit;
    $msg = end($out);
    if (count($out) > 1) { $texts = []; foreach ($out as $m) $texts[] = g($m, 'text'); $msg['text'] = implode("\n\n", array_filter($texts)); }
    if (g($msg, 'type') === 'picture') { $msg['type'] = 'text'; unset($msg['media']); } // у вітанні — лише текст з кнопками
    header('Content-Type: application/json');
    echo json_encode(['sender' => ['name' => cut(S('shop'), 28)], 'min_api_version' => 3] + $msg, JSON_UNESCAPED_UNICODE);
    exit;
}
echo 'ok';
if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
if ($ev !== 'message') exit;

$user = g($u, 'sender', []);
$m = g($u, 'message', []);
$chatKey = 'vb:' . g($user, 'id');
$text = trim((string)g($m, 'text'));
if (g($m, 'type') === 'contact') $text = (string)g(g($m, 'contact', []), 'phone_number');
// Натискання кнопки приходить як текст з ActionBody
$isButton = preg_match('/^(ok|edit|name_ok|phone_ok|phone_new|go|chg|cancel|cancel_yes|city_again|wh_again|c:\d|w:\d)$/', $text);
$st = load('chats', $chatKey);
if (!$st && preg_match('/^o\d+_[a-f0-9]{10}$/', $text)) { flow_start($chatKey, $text); exit; }
flow_input($chatKey, $isButton ? $text : '', $isButton ? '' : $text, (string)g($user, 'name'));
