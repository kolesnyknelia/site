<?php
/* Кабінет Нелі: учні, пристрої, розблокування, налаштування захисту.
   Пароль — секрет KONSPEKT_ADMIN_PASS у GitHub (потрапляє в private/config.php під час публікації). */
define('KG', 1);
require __DIR__ . '/lib.php';

$pass = (string)kg_cfg('admin_pass');
$self = kg_base() . 'admin.php';
if ($pass === '') kg_page('Кабінет', '<div class="card"><h1>Кабінет недоступний</h1><p>Пароль адміністратора ще не задано. Додайте секрет <b>KONSPEKT_ADMIN_PASS</b> у GitHub і перезапустіть публікацію конспекту.</p></div>');

$d = kg_db();
function kg_admin_ok($d) {
    $c = explode('|', (string)($_COOKIE['kg_a'] ?? ''));
    return count($c) === 2 && (int)$c[0] > kg_now() && hash_equals(kg_sign($d['secret'], 'a|' . $c[0] . '|' . kg_cfg('admin_pass')), $c[1]);
}
function kg_csrf($d) { return kg_sign($d['secret'], 'csrf|' . ($_COOKIE['kg_a'] ?? '')); }

/* ---------- вхід / вихід ---------- */
if (isset($_GET['logout'])) { kg_set_cookie('kg_a', '', 0); header('Location: ' . $self); exit; }
if (!kg_admin_ok($d)) {
    $err = '';
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $ip = kg_ip();
        $r = kg_db_tx(function (&$d) use ($ip, $pass) {
            $now = kg_now();
            $f = array_values(array_filter($d['admin_fail'][$ip] ?? [], function ($t) use ($now) { return $t > $now - 900; }));
            if (count($f) >= 5) return 'wait';
            if (hash_equals(hash('sha256', $pass), hash('sha256', (string)($_POST['pass'] ?? '')))) { unset($d['admin_fail'][$ip]); return 'ok'; }
            $f[] = $now; $d['admin_fail'][$ip] = $f; return 'bad';
        });
        if ($r === 'ok') {
            $exp = kg_now() + 43200;
            kg_set_cookie('kg_a', $exp . '|' . kg_sign($d['secret'], 'a|' . $exp . '|' . $pass), 43200);
            header('Location: ' . $self . (isset($_GET['q']) ? '?q=' . rawurlencode((string)$_GET['q']) : '')); exit;
        }
        $err = $r === 'wait' ? 'Забагато спроб. Зачекайте 15 хвилин.' : 'Пароль не підходить.';
    }
    kg_page('Кабінет · вхід', '<div class="card"><h1>Кабінет конспекту</h1>' . ($err ? '<div class="msg bad">' . h($err) . '</div>' : '')
        . '<form method="post"><label for="p">Пароль</label><input id="p" type="password" name="pass" autocomplete="current-password" required autofocus><button class="full">Увійти</button></form></div>');
}

/* ---------- дії ---------- */
$flash = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals(kg_csrf($d), (string)($_POST['csrf'] ?? ''))) { http_response_code(400); exit('Оновіть сторінку і спробуйте ще раз.'); }
    $a = (string)($_POST['a'] ?? '');
    $em = kg_email($_POST['email'] ?? '');
    if ($a === 'add') {
        preg_match_all('/[^\s,;<>"\'()]+@[^\s,;<>"\'()]+/u', (string)($_POST['list'] ?? ''), $mm);
        $flash = kg_db_tx(function (&$d) use ($mm) {
            $add = 0; $had = 0;
            foreach (array_unique(array_map('kg_email', $mm[0])) as $e) {
                if ($e === '') continue;
                if (isset($d['users'][$e])) { $had++; continue; }
                $d['users'][$e] = ['status' => 'active', 'added' => kg_now(), 'devices' => [], 'last' => 0];
                $add++;
            }
            if ($add) kg_log($d, "➕ Додано учнів: $add");
            return "Додано: $add. Уже були у списку: $had.";
        });
    } elseif ($a === 'unblock' && $em) {
        $flash = kg_db_tx(function (&$d) use ($em) {
            if (!isset($d['users'][$em])) return 'Учня не знайдено.';
            $d['users'][$em]['status'] = 'active'; $d['users'][$em]['devices'] = []; unset($d['users'][$em]['blocked']);
            kg_log($d, "🔓 $em — розблоковано, пристрої скинуто");
            return "$em — розблоковано. Пристрої скинуто: учень заново входить за кодом.";
        });
    } elseif ($a === 'reset' && $em) {
        $flash = kg_db_tx(function (&$d) use ($em) {
            if (!isset($d['users'][$em])) return 'Учня не знайдено.';
            $d['users'][$em]['devices'] = [];
            kg_log($d, "♻️ $em — пристрої скинуто");
            return "$em — пристрої скинуто.";
        });
    } elseif ($a === 'block' && $em) {
        $flash = kg_db_tx(function (&$d) use ($em) {
            if (!isset($d['users'][$em])) return 'Учня не знайдено.';
            $d['users'][$em]['status'] = 'blocked'; $d['users'][$em]['blocked'] = ['at' => kg_now(), 'why' => 'Заблоковано вручну'];
            kg_log($d, "⛔ $em — заблоковано вручну");
            return "$em — заблоковано.";
        });
    } elseif ($a === 'delete' && $em) {
        $flash = kg_db_tx(function (&$d) use ($em) {
            unset($d['users'][$em], $d['codes'][$em]);
            kg_log($d, "🗑 $em — видалено зі списку");
            return "$em — видалено зі списку.";
        });
    } elseif ($a === 'toggle') {
        $flash = kg_db_tx(function (&$d) {
            $on = empty($d['settings']['enabled']);
            if ($on && !$d['users']) return 'Спершу додайте хоча б одну пошту (свою теж).';
            $d['settings']['enabled'] = $on;
            kg_log($d, $on ? '🔐 Захист увімкнено' : '🔓 Захист вимкнено');
            return $on ? 'Захист увімкнено: конспект відкривається лише за кодом з пошти.' : 'Захист вимкнено: конспект відкривається за посиланням, як раніше.';
        });
    } elseif ($a === 'settings') {
        $flash = kg_db_tx(function (&$d) {
            $s = &$d['settings'];
            $s['max_devices'] = min(5, max(1, (int)($_POST['max_devices'] ?? 2)));
            $s['mail_from'] = kg_email($_POST['mail_from'] ?? '') ?: $s['mail_from'];
            $sup = trim((string)($_POST['support'] ?? ''));
            $s['support'] = preg_match('#^https?://#', $sup) ? $sup : $s['support'];
            $tok = trim((string)($_POST['tg_token'] ?? ''));
            if ($tok !== '') $s['tg_token'] = $tok;
            $s['tg_chat'] = trim((string)($_POST['tg_chat'] ?? ''));
            return 'Налаштування збережено.';
        });
    } elseif ($a === 'test_tg') {
        $d = kg_db();
        $flash = kg_tg($d, '✅ Тест: сповіщення з конспекту «Сайт за 1 вечір» працюють.') ? 'Повідомлення в Telegram надіслано — перевірте групу.' : 'Не вдалося надіслати в Telegram. Перевірте токен бота і ID групи, і що бот доданий у групу.';
    } elseif ($a === 'test_mail' && $em) {
        $d = kg_db();
        $flash = kg_mail($d, $em, 'Тест: лист з конспекту', "Це тестовий лист. Якщо ви його бачите — коди для входу теж доходитимуть.\nПеревірте, чи лист не потрапив у «Спам».\n") ? "Лист надіслано на $em. Перевірте пошту, зокрема «Спам»." : 'Хостинг не зміг надіслати лист. Перевірте адресу відправника.';
    }
    $d = kg_db();
}

/* ---------- сторінка ---------- */
$S = $d['settings']; $max = max(1, (int)$S['max_devices']); $csrf = h(kg_csrf($d));
$q = strtolower(trim((string)($_GET['q'] ?? '')));
$f = function ($a, $label, $email = '', $cls = 'soft small', $confirm = '') use ($csrf, $q) {
    return '<form class="inline" method="post" action="?q=' . h(rawurlencode($q)) . '"' . ($confirm ? ' onsubmit="return confirm(\'' . h($confirm) . '\')"' : '') . '><input type="hidden" name="csrf" value="' . $csrf . '"><input type="hidden" name="a" value="' . $a . '">'
        . ($email !== '' ? '<input type="hidden" name="email" value="' . h($email) . '">' : '') . '<button class="' . $cls . '">' . $label . '</button></form>';
};
$dt = function ($t) { return $t ? date('d.m.Y H:i', $t) : '—'; };

$users = $d['users'];
uksort($users, function ($a, $b) use ($users) {
    $x = ($users[$a]['status'] === 'blocked' ? 0 : 1); $y = ($users[$b]['status'] === 'blocked' ? 0 : 1);
    return $x !== $y ? $x - $y : strcmp($a, $b);
});
$cnt = count($users); $blocked = count(array_filter($users, function ($u) { return $u['status'] === 'blocked'; }));
if ($q !== '') $users = array_filter($users, function ($u, $e) use ($q) { return strpos($e, $q) !== false; }, ARRAY_FILTER_USE_BOTH);

$rows = '';
foreach ($users as $e => $u) {
    $devs = '';
    foreach ($u['devices'] as $dv) $devs .= '<div>' . h($dv['ua']) . ' <span class="muted">· ' . $dt($dv['last']) . '</span></div>';
    $st = $u['status'] === 'blocked'
        ? '<span class="tag bad">заблоковано</span>' . (!empty($u['blocked']['why']) ? '<div class="muted">' . h($u['blocked']['why']) . ' · ' . $dt($u['blocked']['at']) . '</div>' : '')
        : '<span class="tag">активний</span>';
    $act = $u['status'] === 'blocked'
        ? $f('unblock', '🔓 Розблокувати', $e, 'small')
        : ($u['devices'] ? $f('reset', '♻️ Скинути пристрої', $e) : '') . $f('block', '⛔ Заблокувати', $e, 'soft small', 'Заблокувати ' . $e . '?');
    $act .= $f('delete', '🗑', $e, 'bad small', 'Видалити ' . $e . ' зі списку учнів?');
    $rows .= '<tr><td><b>' . h($e) . '</b></td><td>' . $st . '</td><td>' . count($u['devices']) . '/' . $max . $devs . '</td><td>' . $dt($u['last']) . '</td><td>' . $act . '</td></tr>';
}
if ($rows === '') $rows = '<tr><td colspan="5" class="muted">' . ($q !== '' ? 'Нічого не знайдено.' : 'Ще немає жодного учня — додайте пошти вище.') . '</td></tr>';

$log = '';
foreach (array_slice($d['log'], 0, 40) as $l) $log .= '<tr><td class="muted" style="white-space:nowrap">' . $dt($l[0]) . '</td><td>' . h($l[1]) . '</td></tr>';

$tok = (string)$S['tg_token'];
$on = !empty($S['enabled']);
$body = '<div class="row" style="margin-bottom:14px"><div><h1>Кабінет конспекту</h1><p class="muted" style="margin:0">Учнів: ' . $cnt . ' · заблоковано: ' . $blocked . '</p></div>'
    . '<div style="flex:0 0 auto"><a class="btn soft" href="' . h(kg_base()) . '" target="_blank" rel="noopener">Відкрити конспект</a> <a class="btn soft" href="?logout=1">Вийти</a></div></div>'
    . ($flash ? '<div class="msg">' . h($flash) . '</div>' : '')

    . '<div class="card"><h2>Захист ' . ($on ? '<span class="tag">увімкнено</span>' : '<span class="tag off">вимкнено</span>') . '</h2>'
    . '<p>' . ($on ? 'Конспект відкривається лише за кодом з пошти, максимум на ' . $max . ' пристроях. Зайвий пристрій — блок і повідомлення вам у Telegram.'
                   : 'Зараз конспект відкривається за посиланням, як раніше. Перед увімкненням: додайте пошти учнів (і свою), перевірте тестовий лист і Telegram.') . '</p>'
    . $f('toggle', $on ? 'Вимкнути захист' : 'Увімкнути захист', '', $on ? 'soft' : '', $on ? 'Вимкнути захист? Конспект знову відкриватиметься за посиланням.' : '') . '</div>'

    . '<div class="card"><h2>Додати учнів</h2><form method="post"><input type="hidden" name="csrf" value="' . $csrf . '"><input type="hidden" name="a" value="add">'
    . '<textarea name="list" rows="5" placeholder="Вставте пошти — кожну з нового рядка або через кому. Можна вставити цілу колонку з таблиці SendPulse."></textarea><button>Додати</button></form></div>'

    . '<div class="card"><div class="row"><h2 style="margin:0">Учні</h2><form method="get" style="flex:2 1 260px"><input name="q" value="' . h($q) . '" placeholder="Пошук за поштою"></form></div>'
    . '<div class="scroll"><table><tr><th>Пошта</th><th>Статус</th><th>Пристрої</th><th>Останній вхід</th><th></th></tr>' . $rows . '</table></div>'
    . '<p class="muted" style="margin-top:12px">«Розблокувати» — повертає доступ і скидає пристрої: учень заново входить за кодом на своїх пристроях.</p></div>'

    . '<div class="card"><h2>Налаштування</h2><form method="post"><input type="hidden" name="csrf" value="' . $csrf . '"><input type="hidden" name="a" value="settings">'
    . '<div class="row"><div><label>Скільки пристроїв на учня</label><input type="number" name="max_devices" min="1" max="5" value="' . $max . '"></div>'
    . '<div><label>Пошта відправника кодів</label><input name="mail_from" value="' . h($S['mail_from']) . '"></div></div>'
    . '<label>Посилання на підтримку</label><input name="support" value="' . h($S['support']) . '">'
    . '<div class="row"><div><label>Токен Telegram-бота для сповіщень</label><input name="tg_token" autocomplete="off" placeholder="' . ($tok !== '' ? h(substr($tok, 0, 6)) . '… (збережено; щоб змінити — вставте новий)' : 'токен від @BotFather') . '"></div>'
    . '<div><label>ID групи для сповіщень</label><input name="tg_chat" value="' . h($S['tg_chat']) . '" placeholder="-4839201764"></div></div>'
    . '<button>Зберегти</button></form>'
    . '<div class="row" style="margin-top:8px">' . $f('test_tg', 'Тест Telegram', '', 'soft')
    . '<form class="inline" method="post"><input type="hidden" name="csrf" value="' . $csrf . '"><input type="hidden" name="a" value="test_mail"><div class="row"><input name="email" type="email" placeholder="ваша пошта для тестового листа" required><button class="soft" style="flex:0 0 auto">Тестовий лист</button></div></form></div></div>'

    . '<div class="card"><h2>Журнал</h2><div class="scroll"><table>' . ($log ?: '<tr><td class="muted">Поки порожньо.</td></tr>') . '</table></div></div>';
kg_page('Кабінет конспекту', $body, true);
