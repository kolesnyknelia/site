<?php
/* Вхід у конспект: пошта → код на пошту → конспект.
   Пристрій понад ліміт → доступ блокується на всіх пристроях, Неля отримує повідомлення в Telegram. */
define('KG', 1);
require __DIR__ . '/lib.php';

/* ---------- віддати конспект або файл з нього ----------
   Файли в private/ збережені як «назва.php» з рядком «<?php exit; ?>» на початку: навіть якщо сервер
   віддає статику в обхід .htaccess, напряму відкриється порожня сторінка. Тут цей рядок пропускаємо. */
const KG_WRAP = "<?php exit; ?>\n";
function kg_passthru($f) {
    $fh = fopen($f, 'rb'); fseek($fh, strlen(KG_WRAP)); fpassthru($fh); fclose($fh);
}
function kg_serve($asset) {
    if ($asset !== '') {
        if (!preg_match('#^(img|files)/([A-Za-z0-9._-]+)$#', $asset) || strpos($asset, '..') !== false) { http_response_code(404); exit; }
        $f = KG_PRIV . '/' . $asset . '.php';
        if (!is_file($f)) { http_response_code(404); exit; }
        $types = ['webp' => 'image/webp', 'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'gif' => 'image/gif', 'svg' => 'image/svg+xml',
                  'zip' => 'application/zip', 'txt' => 'text/plain; charset=utf-8', 'pdf' => 'application/pdf'];
        $ext = strtolower(pathinfo($asset, PATHINFO_EXTENSION));
        header('Content-Type: ' . ($types[$ext] ?? 'application/octet-stream'));
        header('Content-Length: ' . (filesize($f) - strlen(KG_WRAP)));
        header('Cache-Control: private, max-age=3600');
        header('X-Robots-Tag: noindex, nofollow');
        if ($ext === 'zip') header('Content-Disposition: attachment; filename="' . basename($asset) . '"');
        kg_passthru($f); exit;
    }
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow, noarchive');
    header('Referrer-Policy: no-referrer');
    if (is_file(KG_PRIV . '/konspekt.html.php')) { kg_passthru(KG_PRIV . '/konspekt.html.php'); exit; }
    // Публікацію перервано на півдорозі — віддаємо попередню версію, якщо вона ще лежить поруч
    if (is_file(__DIR__ . '/index.html')) { readfile(__DIR__ . '/index.html'); exit; }
    http_response_code(503); header('Retry-After: 120');
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><p style="font:18px system-ui;max-width:420px;margin:60px auto;padding:0 16px">Конспект оновлюється. Спробуйте відкрити його за 2–3 хвилини.</p>'; exit;
}

$asset = (string)($_GET['asset'] ?? '');
$d = kg_db();
$S = $d['settings'];

// Захист вимкнено (поки Неля не додала учнів) — конспект відкривається як раніше
if (empty($S['enabled'])) kg_serve($asset);

$dev = kg_device();
if (isset($_GET['logout'])) { kg_set_cookie('kg_s', '', 0); header('Location: ' . kg_base()); exit; }
if (kg_session_user($d)) kg_serve($asset);
if ($asset !== '') { http_response_code(403); exit; }

$max = max(1, (int)$S['max_devices']);
$support = (string)$S['support'];
$email = kg_email($_POST['email'] ?? '');
$step = 'email'; $msg = ''; $msgClass = '';

function kg_blocked_page($support) {
    kg_page('Доступ заблоковано', '<div class="card"><h1>🔒 Доступ заблоковано</h1>'
        . '<p>Конспект відкрили на більшій кількості пристроїв, ніж дозволено, тому доступ тимчасово закрито.</p>'
        . '<p>Якщо це помилка — наприклад, у вас новий телефон або ви очистили браузер, — напишіть у підтримку, і ми відновимо доступ.</p>'
        . ($support ? '<a class="btn" href="' . h($support) . '" target="_blank" rel="noopener">💬 Написати в підтримку</a>' : '') . '</div>');
}

$action = $_SERVER['REQUEST_METHOD'] === 'POST' ? (string)($_POST['action'] ?? '') : '';

if ($action === 'send') {
    if (!$email) { $msg = 'Перевірте, чи правильно написана пошта.'; $msgClass = 'bad'; }
    else {
        $res = kg_db_tx(function (&$d) use ($email) {
            $u = $d['users'][$email] ?? null;
            if (!$u) return 'unknown';
            if ($u['status'] !== 'active') return 'blocked';
            $now = kg_now(); $ip = kg_ip();
            $c = $d['codes'][$email] ?? ['sent' => []];
            $c['sent'] = array_values(array_filter($c['sent'] ?? [], function ($t) use ($now) { return $t > $now - 3600; }));
            if ($c['sent'] && max($c['sent']) > $now - KG_SEND_GAP) return 'wait';
            if (count($c['sent']) >= KG_SEND_HOUR) return 'hour';
            $ips = array_values(array_filter($d['ip_sends'][$ip] ?? [], function ($t) use ($now) { return $t > $now - 3600; }));
            if (count($ips) >= KG_IP_HOUR) return 'hour';
            $code = str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
            $c['hash'] = kg_sign($d['secret'], 'c|' . $email . '|' . $code);
            $c['exp'] = $now + KG_CODE_TTL; $c['tries'] = 0; $c['sent'][] = $now;
            $d['codes'][$email] = $c;
            $ips[] = $now; $d['ip_sends'][$ip] = $ips;
            foreach ($d['ip_sends'] as $k => $v) if (max($v) < $now - 3600) unset($d['ip_sends'][$k]);
            return ['code' => $code];
        });
        if ($res === 'unknown') { $msg = 'Цієї пошти немає у списку учнів. Перевірте, чи правильно написали, — або напишіть у підтримку.'; $msgClass = 'bad'; }
        elseif ($res === 'blocked') kg_blocked_page($support);
        elseif ($res === 'wait') { $step = 'code'; $msg = 'Код уже надіслано. Новий можна отримати через хвилину.'; $msgClass = 'warn'; }
        elseif ($res === 'hour') { $msg = 'Забагато спроб. Спробуйте через годину або напишіть у підтримку.'; $msgClass = 'bad'; }
        else {
            $ok = kg_mail($d, $email, 'Код для входу в конспект: ' . $res['code'],
                "Ваш код для входу в конспект «Сайт за 1 вечір з ШІ»:\n\n" . $res['code'] . "\n\nКод діє 15 хвилин.\nЯкщо ви не запитували код — просто ігноруйте цей лист.\n");
            if ($ok) { $step = 'code'; }
            else { $msg = 'Не вдалося надіслати лист. Спробуйте ще раз за хвилину або напишіть у підтримку.'; $msgClass = 'bad'; }
        }
    }
}

if ($action === 'verify' && $email) {
    $code = preg_replace('/\D/', '', (string)($_POST['code'] ?? ''));
    $ua = kg_ua_label(); $ip = kg_ip();
    $res = kg_db_tx(function (&$d) use ($email, $code, $dev, $ua, $ip, $max) {
        $u = $d['users'][$email] ?? null;
        if (!$u) return ['r' => 'unknown'];
        if ($u['status'] !== 'active') return ['r' => 'blocked'];
        $c = $d['codes'][$email] ?? null;
        if (!$c || empty($c['hash']) || $c['exp'] < kg_now()) return ['r' => 'expired'];
        if (!hash_equals($c['hash'], kg_sign($d['secret'], 'c|' . $email . '|' . $code))) {
            $c['tries']++;
            if ($c['tries'] >= KG_CODE_TRIES) { $c['hash'] = ''; $d['codes'][$email] = $c; return ['r' => 'expired']; }
            $d['codes'][$email] = $c;
            return ['r' => 'wrong', 'left' => KG_CODE_TRIES - $c['tries']];
        }
        $c['hash'] = ''; $d['codes'][$email] = $c;
        $now = kg_now();
        if (!isset($u['devices'][$dev]) && count($u['devices']) >= $max) {
            $u['status'] = 'blocked';
            $u['blocked'] = ['at' => $now, 'why' => 'Пристрій №' . (count($u['devices']) + 1) . ': ' . $ua . ', IP ' . $ip];
            $d['users'][$email] = $u;
            kg_log($d, "🔒 $email — заблоковано: пристрій №" . (count($u['devices']) + 1) . " ($ua)");
            return ['r' => 'block', 'n' => count($u['devices']) + 1];
        }
        $new = !isset($u['devices'][$dev]);
        $u['devices'][$dev] = ['ua' => $ua, 'ip' => $ip, 'first' => $u['devices'][$dev]['first'] ?? $now, 'last' => $now];
        $u['last'] = $now;
        $d['users'][$email] = $u;
        if ($new) kg_log($d, "✅ $email — новий пристрій " . count($u['devices']) . "/$max ($ua)");
        return ['r' => 'ok', 'session' => kg_session_make($d, $email, $dev)];
    });
    if ($res['r'] === 'ok') { kg_set_cookie('kg_s', $res['session'], KG_SESSION_TTL); header('Location: ' . kg_base()); exit; }
    if ($res['r'] === 'block') {
        $d = kg_db();
        kg_tg($d, "🔒 Конспект «Сайт за 1 вечір»: заблоковано доступ\n\nПошта: $email\nПристрій №{$res['n']} (дозволено $max): $ua\nIP: $ip\n\nРозблокувати: " . kg_site_url() . 'admin.php?q=' . rawurlencode($email));
        kg_blocked_page($support);
    }
    if ($res['r'] === 'blocked') kg_blocked_page($support);
    if ($res['r'] === 'unknown') { $msg = 'Цієї пошти немає у списку учнів.'; $msgClass = 'bad'; }
    elseif ($res['r'] === 'expired') { $msg = 'Код застарів або спроби закінчилися — отримайте новий код.'; $msgClass = 'warn'; }
    else { $step = 'code'; $msg = 'Код не підходить. Залишилось спроб: ' . $res['left'] . '.'; $msgClass = 'bad'; }
}

$m = $msg ? '<div class="msg ' . $msgClass . '">' . h($msg) . '</div>' : '';
$head = '<p class="muted" style="margin:0 0 4px">Неля Колесник</p><h1>Конспект курсу «Сайт за 1 вечір з ШІ»</h1>';
if ($step === 'code') {
    $body = '<div class="card">' . $head . '<p>Ми надіслали 6-значний код на <b>' . h($email) . '</b>. Не бачите листа — перевірте «Спам» і «Промоакції».</p>' . $m
        . '<form method="post" autocomplete="off"><input type="hidden" name="action" value="verify"><input type="hidden" name="email" value="' . h($email) . '">'
        . '<label for="code">Код з листа</label><input class="code" id="code" name="code" inputmode="numeric" pattern="[0-9 ]*" maxlength="7" autocomplete="one-time-code" required autofocus>'
        . '<button class="full" type="submit">Увійти</button></form>'
        . '<form method="post"><input type="hidden" name="action" value="send"><input type="hidden" name="email" value="' . h($email) . '">'
        . '<button class="full soft" type="submit">Надіслати код ще раз</button></form>'
        . '<p class="muted" style="margin-top:14px"><a href="' . h(kg_base()) . '">Увійти з іншою поштою</a></p></div>';
} else {
    $body = '<div class="card">' . $head . '<p>Введіть пошту, з якою купували курс, — ми надішлемо код для входу.</p>' . $m
        . '<form method="post"><input type="hidden" name="action" value="send">'
        . '<label for="email">Пошта</label><input id="email" name="email" type="email" inputmode="email" autocomplete="email" required autofocus value="' . h($email) . '">'
        . '<button class="full" type="submit">Отримати код</button></form></div>';
}
$body .= '<div class="card"><p class="muted" style="margin:0">🔐 Конспект відкривається максимум на <b>' . $max . ' ' . ($max === 1 ? 'пристрої' : 'пристроях') . '</b>'
    . ($max === 2 ? ' — наприклад, телефон і комп\'ютер' : '') . '. Заходьте з того самого браузера. Не передавайте доступ іншим: на зайвому пристрої доступ блокується.</p>'
    . ($support ? '<p class="muted" style="margin:10px 0 0">Щось не виходить? <a href="' . h($support) . '" target="_blank" rel="noopener">Напишіть у підтримку</a></p>' : '') . '</div>';
kg_page('Вхід у конспект', $body);
