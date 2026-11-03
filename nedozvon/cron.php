<?php
/* Запускається щохвилини (cron на хостингу). Шукає в LP-CRM замовлення у статусах із settings.php ('watch')
   і один раз надсилає клієнту Viber (з SMS, якщо Viber не дійшов) з посиланням на бота.
   Запуск: php /шлях/nedozvon/cron.php   або   https://сайт/nedozvon/cron.php?key=СЕКРЕТ */
define('NZ', 1);
require __DIR__ . '/lib.php';
header('Content-Type: text/plain; charset=utf-8');
if (PHP_SAPI !== 'cli' && (!K('SECRET') || !hash_equals(K('SECRET'), (string)g($_GET, 'key')))) { http_response_code(403); exit("forbidden\n"); }
$dry = PHP_SAPI === 'cli' ? in_array('--dry', $argv, true) : !empty($_GET['dry']);

$lock = lock('cron');
if (!$lock) exit("already running\n");

$h = (int)date('G');
list($from, $to) = (array)S('work_hours', [9, 21]);
$canSend = $h >= $from && $h < $to;
$sent = 0; $max = (int)S('max_per_run', 20);
$fetched = 0; $maxFetch = 15;
$start = date('Y-m-d', strtotime('-' . (int)S('lookback_days', 2) . ' days'));

foreach ((array)S('watch', []) as $name => $delay) {
    $sid = status_id($name);
    if (!$sid) { echo "Статус «{$name}» не знайдено в LP-CRM\n"; nz_log('no_status', ['name' => $name]); continue; }
    $ids = crm_ids_by_status($sid);
    echo "«{$name}» (#{$sid}): " . count($ids) . " замовл.\n";
    foreach ($ids as $id) {
        if (!preg_match('/^\d{1,20}$/', $id)) continue;
        $rec = load('orders', $id);
        // «bad phone» з першої версії (телефон не розпізнавався) — перевіряємо ще раз
        if (g($rec, 'error') === 'bad phone' && empty($rec['pv'])) { unset($rec['sent_at'], $rec['error'], $rec['phone']); }
        // Відправка, що впала з помилкою авторизації TurboSMS до виправлення, — пробуємо ще раз
        if (!empty($rec['sent_at']) && empty($rec['tries']) && isset($rec['send']['ok']) && !$rec['send']['ok']) { unset($rec['sent_at']); $rec['tries'] = 1; }
        if (!empty($rec['sent_at'])) continue;
        if (empty($rec['seen_at'])) { $rec['seen_at'] = time(); save('orders', $id, $rec); }
        if (time() - (int)$rec['seen_at'] < (int)$delay * 60) continue;
        if (!$canSend || $sent >= $max) continue;
        $test = array_filter(array_map('norm_phone', (array)S('test_phones', [])));
        // тестовий режим: номер цього замовлення вже відомий і він не тестовий — навіть не питаємо CRM
        if ($test && !empty($rec['phone']) && !in_array($rec['phone'], $test, true)) continue;
        if ($fetched >= $maxFetch) continue;              // не більше N запитів замовлень за запуск (ліміт LP-CRM)
        $fetched++;
        $o = crm_order($id);
        if (!$o) continue;
        $rec['phone'] = norm_phone($o['phone']); save('orders', $id, $rec);
        if ($o['status'] !== '' && !status_is($o['status'], $sid)) continue;   // оператор уже змінив статус
        $phone = norm_phone($o['phone']);
        if (!$phone) { $rec['sent_at'] = date('c'); $rec['error'] = 'bad phone'; $rec['pv'] = 2; save('orders', $id, $rec); continue; }
        if ($test && !in_array($phone, $test, true)) continue;   // тестовий режим: інших не чіпаємо і не позначаємо
        if ($dry) { echo "  [тест] надіслали б {$o['num']} → {$phone}\n"; $sent++; continue; }
        $res = send_sms($phone, $id, $o);
        $rec['send'] = $res; $rec['status_name'] = $name;
        if ($res['ok'] || (int)g($rec, 'tries', 0) >= 5) $rec['sent_at'] = date('c');   // невдалу відправку повторюємо (до 5 разів)
        else $rec['tries'] = (int)g($rec, 'tries', 0) + 1;
        save('orders', $id, $rec);
        nz_log('sms', ['order' => $id, 'num' => $o['num'], 'ok' => $res['ok'], 'code' => g($res, 'code')]);
        echo "  {$o['num']} → " . ($res['ok'] ? 'надіслано' : 'ПОМИЛКА ' . json_encode($res, JSON_UNESCAPED_UNICODE)) . "\n";
        $sent++;
    }
}
if (array_filter((array)S('test_phones', []))) echo "🧪 Тестовий режим: пишемо лише на " . implode(', ', (array)S('test_phones', [])) . "\n";
echo $canSend ? "Надіслано: {$sent}\n" : "Зараз неробочий час ({$from}:00–{$to}:00) — нікому не пишемо\n";
