<?php
/* «Формула Claude»: WayForPay serviceUrl. На хостинг потрапляє як formulaclaude/api/wfp-callback.php.
   Копія api/wfp-callback.php (kvn.kiev.ua) з книгою SendPulse «Формули Claude» і пакетами.
   Перевірка підпису, магазину, замовлення, суми → доступ у SendPulse → Telegram.
   Якщо SendPulse не відповів — НЕ відповідаємо accept (HTTP 503): WayForPay повторить
   callback (до ~4 діб), і доступ відкриється автоматично, щойно SendPulse запрацює. */
define('APP', 1);
require __DIR__ . '/lib.php';
$s = settings();
$HEAD = "✳️ <b>ФОРМУЛА CLAUDE</b>\n";

function accept_and_exit($ref) {
    $time = time();
    header('Content-Type: application/json');
    echo json_encode(array('orderReference' => $ref, 'status' => 'accept', 'time' => $time, 'signature' => wfp_sign(array($ref, 'accept', $time))));
    exit;
}

$raw = file_get_contents('php://input');
$d = json_decode($raw, true);
if (!is_array($d)) { $keys = array_keys($_POST); $d = $keys ? json_decode((string)$keys[0], true) : null; if (!is_array($d)) $d = $_POST; } // деякі запити приходять як form-data
$ref = (string)g($d, 'orderReference');

// 1. Підпис
$expected = wfp_sign(array(
    g($d, 'merchantAccount'), $ref, g($d, 'amount'), g($d, 'currency'),
    g($d, 'authCode'), g($d, 'cardPan'), g($d, 'transactionStatus'), g($d, 'reasonCode'),
));
if (!$ref || !hash_equals($expected, (string)g($d, 'merchantSignature'))) {
    log_line('callbacks.log', array('ref' => $ref, 'error' => 'bad signature'));
    http_response_code(400); exit('bad signature');
}

$status = (string)g($d, 'transactionStatus');
log_line('callbacks.log', array('ref' => $ref, 'status' => $status, 'amount' => g($d, 'amount'), 'currency' => g($d, 'currency'), 'reason' => g($d, 'reason')));

// 2. Наш магазин і наше замовлення з правильною сумою
$merchant = secret('WFP_MERCHANT') ?: (string)g($s, 'wfp_merchant');
$lock = order_lock($ref);
$o = order_get($ref);
$problem = '';
if ((string)g($d, 'merchantAccount') !== $merchant) $problem = 'інший магазин WayForPay';
elseif (!$o) $problem = 'замовлення не знайдено на сайті';
elseif (abs((float)g($d, 'amount') - (float)g($o, 'amount')) > 0.009 || strtoupper((string)g($d, 'currency')) !== strtoupper((string)g($o, 'currency', $s['currency']))) $problem = 'сума або валюта не збігаються із замовленням';
if ($problem) {
    log_line('callbacks.log', array('ref' => $ref, 'error' => $problem));
    if ($status === 'Approved') tg($HEAD . "⚠️ <b>Оплата потребує перевірки</b>: " . h($problem) . "\n💵 " . h(g($d, 'amount')) . ' ' . h(g($d, 'currency')) . "\n📧 " . h(g($d, 'email')) . "\n🧾 " . h($ref) . "\nДоступ НЕ видано автоматично — перевірте платіж у кабінеті WayForPay.");
    accept_and_exit($ref);
}

$email = (string)g($o, 'email');
$name  = (string)g($o, 'name');
$phone = (string)g($o, 'phone');
$pack  = (string)g($o, 'pack');
$packName = isset($s['packs'][$pack]) ? $s['packs'][$pack]['name'] : $pack;
$who   = "👤 " . h($name) . "\n📧 " . h($email) . "\n📞 " . h($phone ?: '—') . (!empty($o['contact']) ? "\n💬 " . h($o['contact']) : '') . "\n🎫 Пакет: <b>" . h($packName) . "</b>";

// 3. Успішна оплата
if ($status === 'Approved') {
    if (empty($o['paid'])) $o['paid'] = date('c');
    if (!empty($o['sp_ok'])) { order_put($ref, $o); accept_and_exit($ref); } // повтор після успіху — нічого не дублюємо

    // Лише книга «Формули Claude» — без неї НЕ додаємо в книгу курсу kvn.kiev.ua
    $book = (string)g($s, 'sp_book_id');
    if ($book) list($ok, $msg) = sendpulse_add($email, $name, $phone, $book, array('pack' => $packName));
    else { $ok = false; $msg = 'не вказано адресну книгу «Формули Claude» (sp_book_id у налаштуваннях сайту)'; }
    $fails = (int)g($o, 'sp_fails', 0);
    $money = h(g($d, 'amount')) . ' ' . h(g($d, 'currency'));

    if ($ok) {
        $o['sp_ok'] = date('c'); $o['sendpulse'] = 'ok';
        order_put($ref, $o);
        if ($fails) tg($HEAD . "✅ <b>Доступ відкрито після затримки</b> (спроба " . ($fails + 1) . ")\n" . $who . "\n🧾 {$ref}");
        else tg($HEAD . "✅ <b>ОПЛАТА {$money}</b>\n" . $who . "\n🎓 Доступ у SendPulse: відкрито ✅\n📊 " . h(utm_text(g($o, 'utm', array()))) . "\n🧾 {$ref}");
        accept_and_exit($ref);
    }

    // SendPulse не відповів — фіксуємо й просимо WayForPay повторити
    $o['sp_fails'] = $fails + 1; $o['sendpulse'] = $msg;
    if (empty($o['sp_first_fail'])) $o['sp_first_fail'] = time();
    $last = (int)g($o, 'sp_last_alert', 0);
    if (!$fails) {
        tg($HEAD . "✅ <b>ОПЛАТА {$money}</b>\n" . $who . "\n⏳ Доступ ще НЕ відкрито: " . h($msg) . "\nСайт автоматично повторює спробу — повідомлю, щойно вийде.\n📊 " . h(utm_text(g($o, 'utm', array()))) . "\n🧾 {$ref}");
        $o['sp_last_alert'] = time();
    } elseif (time() - $last >= 900) {
        $hours = round((time() - (int)$o['sp_first_fail']) / 3600, 1);
        tg($HEAD . "⏳ <b>Доступ досі не відкрито</b> ({$hours} год, спроба " . ($fails + 1) . "): " . h($msg) . "\n" . $who . "\n🧾 {$ref}"
           . ($hours >= 2 ? "\n❗ Краще додайте покупця в курс вручну (SendPulse → курс → Студенти)." : ''));
        $o['sp_last_alert'] = time();
    }
    order_put($ref, $o);
    http_response_code(503);
    exit('retry later');
}

// 4. Неуспішна оплата
if (in_array($status, array('Declined', 'Expired'), true) && empty($o['notified_fail']) && empty($o['paid'])) {
    $o['notified_fail'] = 1; order_put($ref, $o);
    tg($HEAD . "❌ <b>Оплата не пройшла</b> ({$status}: " . h(g($d, 'reason')) . ")\n" . $who . "\n🧾 {$ref}\nМожна написати клієнту й допомогти оплатити.");
}
accept_and_exit($ref);
