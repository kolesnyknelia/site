<?php
/* Telegram-бот «Недозвон» (webhook). Клієнт приходить за посиланням t.me/бот?start=o<id>_<підпис>.
   Оператори в Telegram-групі відповідають клієнтам через «Відповісти» на повідомлення бота. */
define('NZ', 1);
require __DIR__ . '/lib.php';
if (!K('TG_TOKEN')) { http_response_code(404); exit; }
// Запити приймаємо лише від Telegram (secret_token задається під час setWebhook)
if (!hash_equals(substr(hash('sha256', K('TG_TOKEN')), 0, 32), (string)g($_SERVER, 'HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'))) { http_response_code(403); exit; }

$u = json_decode((string)file_get_contents('php://input'), true);
if (!is_array($u)) exit;
echo 'ok';
if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();

if (isset($u['callback_query'])) {
    $cq = $u['callback_query'];
    $chat = g(g(g($cq, 'message', []), 'chat', []), 'id');
    tg_api('answerCallbackQuery', ['callback_query_id' => $cq['id']]);
    if ((string)$chat === K('TG_OPS_CHAT')) exit;
    // прибираємо кнопки, щоб не натискали двічі
    tg_api('editMessageReplyMarkup', ['chat_id' => $chat, 'message_id' => $cq['message']['message_id'], 'reply_markup' => ['inline_keyboard' => []]]);
    $f = g($cq, 'from', []);
    flow_input('tg:' . $chat, (string)g($cq, 'data'), '', trim(g($f, 'first_name') . ' ' . g($f, 'last_name')) . (g($f, 'username') ? ' @' . $f['username'] : ''));
    exit;
}

$msg = g($u, 'message', []);
if (!$msg) exit;
$chat = (string)g(g($msg, 'chat', []), 'id');
$text = (string)g($msg, 'text');

if ($chat === K('TG_OPS_CHAT')) { ops_reply($msg); exit; }
if (g(g($msg, 'chat', []), 'type') !== 'private') exit;

if (preg_match('/^\/start(?:\s+(\S+))?/', $text, $m)) { flow_start('tg:' . $chat, g($m, 1)); exit; }
$f = g($msg, 'from', []);
if (isset($msg['contact'])) $text = (string)g($msg['contact'], 'phone_number');
if ($text === '' && K('TG_OPS_CHAT') && (isset($msg['photo']) || isset($msg['voice']) || isset($msg['document']) || isset($msg['video']))) {
    // фото/голосове пересилаємо операторам як є, а підпис-текст іде нижче
    tg_api('copyMessage', ['chat_id' => K('TG_OPS_CHAT'), 'from_chat_id' => $chat, 'message_id' => $msg['message_id']]);
    $text = trim('[фото/файл/голосове вище] ' . g($msg, 'caption'));
}
flow_input('tg:' . $chat, '', $text, trim(g($f, 'first_name') . ' ' . g($f, 'last_name')) . (g($f, 'username') ? ' @' . $f['username'] : ''));
