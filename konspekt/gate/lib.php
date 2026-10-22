<?php
/* Вхід у конспект за кодом з пошти + ліміт пристроїв. Спільні функції для index.php і admin.php.
   Дані (учні, пристрої, коди, налаштування) — у private/data/db.php, з браузера недоступні. */
if (!defined('KG')) { http_response_code(404); exit; }

date_default_timezone_set('Europe/Kyiv');

const KG_PRIV = __DIR__ . '/private';
const KG_CODE_TTL = 900;        // код діє 15 хвилин
const KG_CODE_TRIES = 5;        // спроб ввести код
const KG_SEND_GAP = 60;         // новий код — не частіше ніж раз на хвилину
const KG_SEND_HOUR = 6;         // і не більше 6 на годину на одну пошту
const KG_IP_HOUR = 30;          // і не більше 30 на годину з однієї IP
const KG_SESSION_TTL = 2592000; // вхід пам'ятаємо 30 днів

function kg_cfg($k, $def = '') {
    static $c = null;
    if ($c === null) { $f = KG_PRIV . '/config.php'; $c = is_file($f) ? (require $f) : []; if (!is_array($c)) $c = []; }
    return isset($c[$k]) ? $c[$k] : $def;
}
function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function kg_now() { return time(); }
function kg_ip() { return substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45); }

/* ---------- сховище: один JSON-файл під замком ---------- */
function kg_db_path() { return KG_PRIV . '/data/db.php'; }
function kg_db_default() {
    return [
        'secret' => bin2hex(random_bytes(32)),
        'settings' => ['enabled' => false, 'max_devices' => 2, 'tg_token' => '', 'tg_chat' => '',
                       'mail_from' => 'no-reply@kvn.kiev.ua', 'support' => 'https://t.me/hellppbott'],
        'users' => [], 'codes' => [], 'ip_sends' => [], 'admin_fail' => [], 'log' => [],
    ];
}
function kg_db_decode($raw) {
    $p = strpos($raw, "\n");
    $d = $p === false ? null : json_decode(substr($raw, $p + 1), true);
    return is_array($d) ? array_replace(kg_db_default(), $d) : null;
}
function kg_db_lock() {
    $dir = KG_PRIV . '/data';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $fh = fopen($dir . '/.lock', 'c');
    if (!$fh || !flock($fh, LOCK_EX)) throw new RuntimeException('lock');
    return $fh;
}
function kg_db_load_unlocked() {
    $f = kg_db_path();
    $d = is_file($f) ? kg_db_decode((string)file_get_contents($f)) : null;
    if ($d === null) { $d = kg_db_default(); kg_db_save_unlocked($d); }
    return $d;
}
function kg_db_save_unlocked($d) {
    $f = kg_db_path(); $tmp = $f . '.tmp';
    file_put_contents($tmp, "<?php exit; ?>\n" . json_encode($d, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    rename($tmp, $f);
}
/* Читання + зміна під одним замком. $fn отримує дані за посиланням і повертає результат. */
function kg_db_tx($fn) {
    $fh = kg_db_lock();
    try { $d = kg_db_load_unlocked(); $r = $fn($d); kg_db_save_unlocked($d); return $r; }
    finally { flock($fh, LOCK_UN); fclose($fh); }
}
function kg_db() { $fh = kg_db_lock(); try { return kg_db_load_unlocked(); } finally { flock($fh, LOCK_UN); fclose($fh); } }

function kg_log(&$d, $msg) {
    array_unshift($d['log'], [kg_now(), $msg]);
    $d['log'] = array_slice($d['log'], 0, 300);
}
function kg_email($s) {
    $s = strtolower(trim((string)$s));
    return (strlen($s) <= 120 && filter_var($s, FILTER_VALIDATE_EMAIL)) ? $s : '';
}

/* ---------- cookies ---------- */
function kg_base() { $b = rtrim(str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/'))), '/'); return $b . '/'; }
function kg_https() { return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'); }
function kg_set_cookie($name, $val, $ttl) {
    $o = ['expires' => $val === '' ? 1 : kg_now() + $ttl, 'path' => kg_base(), 'secure' => kg_https(), 'httponly' => true, 'samesite' => 'Lax'];
    setcookie($name, $val, $o);
    $_COOKIE[$name] = $val;
}
function kg_sign($secret, $s) { return hash_hmac('sha256', $s, $secret); }

/* Пристрій = випадковий ідентифікатор у cookie цього браузера (на рік). */
function kg_device() {
    $d = (string)($_COOKIE['kg_d'] ?? '');
    if (!preg_match('/^[a-f0-9]{32}$/', $d)) { $d = bin2hex(random_bytes(16)); kg_set_cookie('kg_d', $d, 31536000); }
    return $d;
}
function kg_ua_label() {
    $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
    $os = preg_match('/iPhone/i', $ua) ? 'iPhone' : (preg_match('/iPad/i', $ua) ? 'iPad' : (preg_match('/Android/i', $ua) ? 'Android' :
          (preg_match('/Windows/i', $ua) ? 'Windows' : (preg_match('/Mac OS X|Macintosh/i', $ua) ? 'Mac' : (preg_match('/Linux/i', $ua) ? 'Linux' : 'Інший')))));
    $br = preg_match('/Edg\//', $ua) ? 'Edge' : (preg_match('/OPR\//', $ua) ? 'Opera' : (preg_match('/YaBrowser/', $ua) ? 'Yandex' :
          (preg_match('/Firefox\//', $ua) ? 'Firefox' : (preg_match('/Chrome\//', $ua) ? 'Chrome' : (preg_match('/Safari\//', $ua) ? 'Safari' : 'браузер')))));
    return $os . ' · ' . $br;
}

/* ---------- сесія учня ---------- */
function kg_session_make($d, $email, $dev) {
    $exp = kg_now() + KG_SESSION_TTL;
    $p = base64_encode($email) . '|' . $dev . '|' . $exp;
    return $p . '|' . kg_sign($d['secret'], 's|' . $p);
}
/* Повертає пошту, якщо сесія дійсна, учень активний і пристрій зареєстрований. */
function kg_session_user($d) {
    $c = explode('|', (string)($_COOKIE['kg_s'] ?? ''));
    if (count($c) !== 4) return null;
    list($e64, $dev, $exp, $sig) = $c;
    if (!hash_equals(kg_sign($d['secret'], 's|' . $e64 . '|' . $dev . '|' . $exp), $sig) || (int)$exp < kg_now()) return null;
    $email = (string)base64_decode($e64, true);
    $u = $d['users'][$email] ?? null;
    if (!$u || $u['status'] !== 'active' || $dev !== ($_COOKIE['kg_d'] ?? '') || !isset($u['devices'][$dev])) return null;
    return $email;
}

/* ---------- лист і Telegram ---------- */
function kg_mail($d, $to, $subject, $text) {
    $test = kg_cfg('test_mail_file');
    if ($test) { file_put_contents($test, "To: $to\nSubject: $subject\n\n$text\n", FILE_APPEND); return true; }
    $from = kg_email($d['settings']['mail_from']) ?: 'no-reply@kvn.kiev.ua';
    $headers = "From: =?UTF-8?B?" . base64_encode('Конспект · Неля Колесник') . "?= <$from>\r\n"
             . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit";
    return @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $text, $headers, '-f' . $from);
}
function kg_tg($d, $text) {
    $t = trim((string)$d['settings']['tg_token']); $chat = trim((string)$d['settings']['tg_chat']);
    if ($t === '' || $chat === '') return false;
    $url = 'https://api.telegram.org/bot' . $t . '/sendMessage';
    $body = http_build_query(['chat_id' => $chat, 'text' => $text, 'disable_web_page_preview' => 1]);
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => $body, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8]);
        $r = curl_exec($ch); curl_close($ch);
    } else {
        $r = @file_get_contents($url, false, stream_context_create(['http' => ['method' => 'POST', 'header' => "Content-Type: application/x-www-form-urlencoded\r\n", 'content' => $body, 'timeout' => 8]]));
    }
    $j = json_decode((string)$r, true);
    return !empty($j['ok']);
}
function kg_site_url() { return (kg_https() ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? '') . kg_base(); }

/* ---------- загальний вигляд сторінок ---------- */
function kg_page($title, $body, $wide = false) {
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow');
    header('X-Frame-Options: DENY');
    echo '<!doctype html><html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
       . '<meta name="robots" content="noindex,nofollow"><title>' . h($title) . '</title><style>'
       . ':root{--bg:#f7f3ec;--card:#fffdf9;--ink:#23302a;--muted:#6f7a73;--line:#e6dfd3;--accent:#3b5548;--accent-l:#dfe8e1;--warn:#faeee0;--bad:#f6e3df;--bad-d:#a14a40}'
       . '@media (prefers-color-scheme:dark){:root{--bg:#151b18;--card:#1d2521;--ink:#eef1ec;--muted:#9aa59e;--line:#303b35;--accent:#a9cdb9;--accent-l:#26362e;--warn:#2d261c;--bad:#2f2120;--bad-d:#e29a90}}'
       . '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:400 16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'
       . '.wrap{max-width:' . ($wide ? '1100px' : '440px') . ';margin:0 auto;padding:40px 16px 60px}.card{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:24px;margin-bottom:18px}'
       . 'h1{font-size:22px;line-height:1.25;margin:0 0 6px}h2{font-size:18px;margin:0 0 12px}p{margin:0 0 12px}.muted{color:var(--muted);font-size:14px}'
       . 'label{display:block;font-weight:600;margin:12px 0 6px}input,textarea,select{width:100%;font:inherit;color:inherit;background:var(--bg);border:1.5px solid var(--line);border-radius:12px;padding:12px 14px}'
       . 'input:focus,textarea:focus{outline:2px solid var(--accent);border-color:transparent}.code{font-size:26px;letter-spacing:.35em;text-align:center}'
       . 'button,.btn{display:inline-block;font:600 16px/1 inherit;font-family:inherit;border:0;border-radius:12px;padding:14px 18px;background:var(--accent);color:var(--card);cursor:pointer;text-decoration:none;margin-top:14px}'
       . 'button.full{width:100%}button.soft,.btn.soft{background:var(--accent-l);color:var(--ink)}button.bad{background:var(--bad);color:var(--bad-d)}button.small{font-size:13px;padding:8px 10px;margin:2px 0}'
       . '.msg{border-radius:12px;padding:12px 14px;margin:12px 0;background:var(--accent-l)}.msg.warn{background:var(--warn)}.msg.bad{background:var(--bad)}'
       . 'table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:9px 8px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:600}'
       . '.tag{display:inline-block;border-radius:99px;padding:2px 9px;font-size:12px;font-weight:700;background:var(--accent-l)}.tag.bad{background:var(--bad);color:var(--bad-d)}.tag.off{background:var(--warn)}'
       . '.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.row>*{flex:1 1 180px}.scroll{overflow-x:auto}form.inline{display:inline}a{color:var(--accent)}'
       . '</style></head><body><div class="wrap">' . $body . '</div></body></html>';
    exit;
}
