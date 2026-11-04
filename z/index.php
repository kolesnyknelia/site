<?php
/* Коротке посилання з SMS бота «Недозвон»: /z/?Ab3k9X → сторінка підтвердження замовлення */
define('NZ', 1);
require dirname(__DIR__) . '/nedozvon/lib.php';
$code = preg_replace('/[^A-Za-z0-9]/', '', (string)($_SERVER['QUERY_STRING'] ?? ''));
$l = $code ? load('links', $code) : [];
if (!g($l, 'order')) { http_response_code(404); header('Content-Type: text/html; charset=utf-8'); echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><p style="font:18px system-ui;padding:24px">Посилання недійсне. Перевірте, будь ласка, посилання з SMS.</p>'; exit; }
header('Location: ' . go_link($l['order']), true, 302);
