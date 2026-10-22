<?php
/* Автододавання учня з SendPulse: дія «Відправити вебхук» у сценарії Automation 360 після покупки.
   Адреса з ключем — у кабінеті (admin.php → «Автоматично з SendPulse»), наприклад:
   https://…/hook.php?key=КЛЮЧ&email={{email}}
   Пошту беремо з параметра email (GET/POST) або з будь-якого поля «email» у JSON. */
define('KG', 1);
require __DIR__ . '/lib.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
function kg_out($code, $a) { http_response_code($code); echo json_encode($a, JSON_UNESCAPED_UNICODE); exit; }

$key = (string)($_GET['key'] ?? $_POST['key'] ?? '');
$d = kg_db();
$hk = (string)($d['settings']['hook_key'] ?? '');
if ($hk === '' || $key === '' || !hash_equals($hk, $key)) kg_out(403, ['ok' => false, 'error' => 'key']);

/* Шукаємо пошту: параметр email → JSON-тіло (поле email на будь-якій глибині) */
function kg_find_email($v, $depth = 0) {
    if ($depth > 6 || !is_array($v)) return '';
    foreach ($v as $k => $x) if (is_string($x) && strtolower((string)$k) === 'email' && kg_email($x)) return kg_email($x);
    foreach ($v as $x) if (is_array($x) && ($e = kg_find_email($x, $depth + 1))) return $e;
    return '';
}
$email = kg_email($_GET['email'] ?? $_POST['email'] ?? '');
if (!$email) {
    $raw = (string)file_get_contents('php://input');
    $j = json_decode($raw, true);
    if (is_array($j)) $email = kg_find_email(isset($j[0]) ? $j : [$j]);
}
// Тестовий запит SendPulse може прийти без справжньої пошти — відповідаємо «ок», нічого не додаємо
if (!$email) kg_out(200, ['ok' => true, 'added' => false, 'note' => 'no email']);

$r = kg_db_tx(function (&$d) use ($email) {
    if (isset($d['users'][$email])) return 'exists';
    $d['users'][$email] = ['status' => 'active', 'added' => kg_now(), 'devices' => [], 'last' => 0, 'source' => 'sendpulse'];
    kg_log($d, "🔗 SendPulse: додано $email");
    return 'added';
});
kg_out(200, ['ok' => true, 'added' => $r === 'added']);
