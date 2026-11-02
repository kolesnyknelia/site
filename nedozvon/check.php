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
if (!$st) {
    $e = (array)g($GLOBALS, 'NZ_CRM_ERR', []);
    echo "❌ LP-CRM не відповіла (перевірте домен і ключ API; IP хостингу має бути дозволений у LP-CRM)\n"
       . "   Адреса: " . g($e, 'url', '—') . "\n   HTTP: " . g($e, 'http', '—') . (g($e, 'curl') ? ' · ' . $e['curl'] : '') . "\n   Відповідь: " . (g($e, 'resp') !== '' ? g($e, 'resp') : '(порожньо)') . "\n"
       . "   Довжина ключа: " . strlen(K('LPCRM_KEY')) . " символів\n"
       . "   IP хостингу, з якого бот звертається до LP-CRM: " . (trim((string)@file_get_contents('https://api.ipify.org')) ?: '?') . "\n";
}
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
    $ids = crm_ids_by_status($sid);
    if (!$ids) echo "Відповідь LP-CRM: " . cut(json_encode($GLOBALS['NZ_IDS_RAW'], JSON_UNESCAPED_UNICODE), 300) . "\n";
    echo "\nЗамовлень у статусі зараз: " . count($ids) . ($ids ? ' (напр. ' . implode(', ', array_slice($ids, 0, 5)) . ")\nДодайте &order=" . reset($ids) . " до адреси, щоб побачити дані замовлення" : '') . "\n";
}

echo "\n== Нова пошта ==\n";
if (K('NP_KEY')) {
    $s = np_sender();
    echo $s ? "✅ Відправник: " . g($s, 'name') . "\n✅ Відправляємо з: " . g($s, 'desc') . "\n" : "❌ Не вдалося отримати відправника: " . g($GLOBALS, 'NZ_NP_SENDER_WHY', '?') . "\n";
    $t = np_template();
    $codName = ['afterpayment' => 'Контроль оплати', 'backward' => 'Грошовий переказ', '' => '—'];
    echo $t ? "✅ ТТН робитимемо як ваша остання ({$t['from']}): опис «{$t['description']}», вага {$t['weight']} кг, доставку платить " . ($t['payer'] === 'Sender' ? 'відправник' : 'отримувач') . ", накладений платіж: " . $codName[$t['cod']] . "\n"
            : "⚠️ ТТН за 14 днів не знайдено — беремо запасні значення з settings.php\n";
} else echo "❌ немає NP_KEY\n";

echo "\n== Telegram ==\n";
echo K('TG_TOKEN') ? (($u = tg_username()) ? "✅ @{$u}\n" : "❌ токен не працює\n") : "❌ немає TG_TOKEN\n";
