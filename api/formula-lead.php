<?php
/* Заявка з сайту курсу «Формула свободи» (formula/) → Telegram */
define('APP', 1);
require __DIR__ . '/lib.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit(json_encode(['ok' => false])); }
if (trim((string)g($_POST, 'website')) !== '') exit(json_encode(['ok' => true])); // бот заповнив приховане поле

$PACKS = ['self' => 'Самостійно', 'curator' => 'З куратором', 'mentor' => 'Супровід з Нелею'];

$name    = trim(str_cut(strip_tags((string)g($_POST, 'name')), 80));
$contact = trim(str_cut(strip_tags((string)g($_POST, 'contact')), 80));
$pack    = (string)g($_POST, 'pack');
$note    = trim(str_cut(strip_tags((string)g($_POST, 'note')), 400));
$utm     = json_decode((string)g($_POST, 'utm', '{}'), true);
$utm     = is_array($utm) ? array_slice($utm, 0, 8) : array();
foreach ($utm as $k => $v) $utm[$k] = str_cut((string)$v, 120);

if (str_len($name) < 2 || str_len($contact) < 5) { http_response_code(422); exit(json_encode(['ok' => false, 'error' => 'fields'])); }

$packName = isset($PACKS[$pack]) ? $PACKS[$pack] : 'не обрано';
$nick = preg_match('/^@?([A-Za-z][A-Za-z0-9_]{4,31})$/', $contact, $m) ? $m[1] : '';
$who = $nick ? '<a href="https://t.me/' . $nick . '">@' . $nick . '</a>' : h($contact);

$ok = tg("🎓 <b>Заявка «Формула свободи»</b>\n"
    . "👤 " . h($name) . "\n"
    . "📱 " . $who . "\n"
    . "📦 Пакет: <b>" . h($packName) . "</b>"
    . ($note !== '' ? "\n💬 " . h($note) : '')
    . "\n📊 " . h(utm_text($utm)));
log_line('formula-leads.log', array('name' => $name, 'contact' => $contact, 'pack' => $pack, 'tg' => $ok));

echo json_encode(['ok' => true]);
