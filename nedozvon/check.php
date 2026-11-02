<?php
/* 🩺 Перевірка налаштувань (відкрити в браузері): https://сайт/nedozvon/check.php?key=СЕКРЕТ[&order=ID]
   Показує статуси LP-CRM, дані відправника Нової пошти, Telegram-бота і (за потреби) сирі дані замовлення. */
define('NZ', 1);
require __DIR__ . '/lib.php';
header('Content-Type: text/plain; charset=utf-8');
if (!K('SECRET') || !hash_equals(K('SECRET'), (string)g($_GET, 'key'))) { http_response_code(403); exit("forbidden\n"); }
$ok = function ($b) { return $b ? '✅' : '❌'; };

echo "== Ключі ==\n";
foreach (['LPCRM_DOMAIN', 'LPCRM_KEY', 'TG_TOKEN', 'TG_OPS_CHAT', 'TURBOSMS_TOKEN', 'SMS_SENDER', 'VIBER_SENDER', 'NP_KEY', 'VIBER_TOKEN', 'VIBER_URI'] as $k)
    echo $ok(K($k) !== '') . " {$k}\n";

echo "\n== LP-CRM: статуси ==\n";
$st = crm_statuses();
if (!$st) echo "❌ LP-CRM не відповіла (перевірте домен і ключ API; IP хостингу має бути дозволений у LP-CRM)\n";
foreach ($st as $id => $n) echo "  {$id} — {$n}\n";
foreach (array_keys((array)S('watch', [])) as $n) echo $ok(status_id($n)) . " стежимо: «{$n}» → " . (status_id($n) ?: 'НЕ ЗНАЙДЕНО') . "\n";
echo $ok(status_id(S('status_accepted'))) . " після ТТН ставимо: «" . S('status_accepted') . "» → " . (status_id(S('status_accepted')) ?: 'НЕ ЗНАЙДЕНО') . "\n";
if (S('status_cancel')) echo $ok(status_id(S('status_cancel'))) . " при скасуванні: «" . S('status_cancel') . "» → " . (status_id(S('status_cancel')) ?: 'НЕ ЗНАЙДЕНО') . "\n";

if ($oid = preg_replace('/\D/', '', (string)g($_GET, 'order'))) {
    echo "\n== Замовлення {$oid} ==\n";
    $o = crm_order($oid);
    echo $o ? json_encode(array_diff_key($o, ['raw' => 1]), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n\nСирі дані LP-CRM:\n" . json_encode($o['raw'], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) : '❌ не знайдено';
    echo "\n\nПосилання для клієнта: " . go_link($oid) . "\n";
} elseif ($st && ($sid = status_id(array_keys((array)S('watch', []))[0] ?? ''))) {
    $r = crm('getOrdersIdByStatus', ['status' => $sid, 'date_start' => date('Y-m-d', strtotime('-' . (int)S('lookback_days', 2) . ' days')), 'date_end' => date('Y-m-d')]);
    $ids = (array)g($r, 'data', []);
    echo "\nЗамовлень у статусі зараз: " . count($ids) . ($ids ? ' (напр. ' . implode(', ', array_slice($ids, 0, 5)) . ")\nДодайте &order=" . reset($ids) . " до адреси, щоб побачити дані замовлення" : '') . "\n";
}

echo "\n== Нова пошта ==\n";
if (K('NP_KEY')) {
    $s = np_sender();
    echo $s ? "✅ Відправник: " . g($s, 'name') . "\n✅ Відправляємо з: " . g($s, 'desc') . "\n" : "❌ Не вдалося отримати відправника — див. журнал\n";
} else echo "❌ немає NP_KEY\n";

echo "\n== Telegram ==\n";
echo K('TG_TOKEN') ? (($u = tg_username()) ? "✅ @{$u}\n" : "❌ токен не працює\n") : "❌ немає TG_TOKEN\n";
