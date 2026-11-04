<?php
/* Бот «Недозвон»: спільні функції — налаштування, LP-CRM, Нова пошта, SMS/Viber (TurboSMS),
   Telegram/Viber-повідомлення і сценарій розмови з клієнтом. */
if (!defined('NZ')) { http_response_code(404); exit; }
date_default_timezone_set('Europe/Kyiv');

/* ================= Налаштування ================= */
function S($k, $d = null) {
    static $s = null;
    if ($s === null) $s = require __DIR__ . '/settings.php';
    return array_key_exists($k, $s) ? $s[$k] : $d;
}
/** Секрети: /kvn.kiev.ua/private/nedozvon.php (поза www) */
function K($k) {
    static $c = null;
    if ($c === null) { $f = priv_dir() . '/nedozvon.php'; $c = is_file($f) ? (array)(require $f) : []; }
    return isset($c[$k]) ? (string)$c[$k] : '';
}
function priv_dir() {
    $d = getenv('NZ_PRIVATE_DIR') ?: dirname(dirname(__DIR__)) . '/private';
    if (!is_dir($d)) @mkdir($d, 0750, true);
    return $d;
}
function g($a, $k, $d = '') { return is_array($a) && isset($a[$k]) ? $a[$k] : $d; }
function cut($s, $n) { return function_exists('mb_substr') ? mb_substr((string)$s, 0, $n, 'UTF-8') : substr((string)$s, 0, $n); }

/* ================= Сховище (JSON-файли в private/nedozvon) ================= */
function store_file($kind, $id) {
    $d = priv_dir() . '/nedozvon/' . $kind;
    if (!is_dir($d)) @mkdir($d, 0750, true);
    return $d . '/' . preg_replace('/[^A-Za-z0-9_\-]/', '_', (string)$id) . '.json';
}
function load($kind, $id) { $f = store_file($kind, $id); return is_file($f) ? (array)json_decode((string)file_get_contents($f), true) : []; }
function save($kind, $id, $data) { @file_put_contents(store_file($kind, $id), json_encode($data, JSON_UNESCAPED_UNICODE), LOCK_EX); }
function nz_log($what, $data = []) {
    $data = ['ts' => date('c'), 'what' => $what] + (array)$data;
    @file_put_contents(priv_dir() . '/nedozvon/log-' . date('Y-m') . '.txt', json_encode($data, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
}
/** Ексклюзивне блокування (щоб одне замовлення не оформили двічі) */
function lock($name) {
    $fp = @fopen(store_file('locks', $name), 'c');
    if (!$fp || !flock($fp, LOCK_EX | LOCK_NB)) return null;
    return $fp;
}

/* ================= HTTP ================= */
function http_post($url, $body, $headers = [], $timeout = 20) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_HTTPHEADER => $headers, CURLOPT_POSTFIELDS => $body,
    ]);
    $r = curl_exec($ch);
    $GLOBALS['NZ_HTTP'] = ['code' => (int)curl_getinfo($ch, CURLINFO_HTTP_CODE), 'error' => curl_error($ch)];
    curl_close($ch);
    return $r === false ? '' : (string)$r;
}
function post_json($url, $data, $headers = []) {
    $r = http_post($url, json_encode($data, JSON_UNESCAPED_UNICODE), array_merge(['Content-Type: application/json'], $headers));
    $j = json_decode($r, true);
    return is_array($j) ? $j : [];
}

/* ================= Підпис посилань (щоб чуже замовлення не відкрили, підібравши номер) ================= */
function sig($orderId) { return substr(hash_hmac('sha256', (string)$orderId, K('SECRET') ?: 'nz'), 0, 10); }
function token($orderId) { return 'o' . $orderId . '_' . sig($orderId); }
function parse_token($t) {
    if (!preg_match('/^o(\d{1,20})_([a-f0-9]{10})$/', trim((string)$t), $m)) return '';
    return hash_equals(sig($m[1]), $m[2]) ? $m[1] : '';
}
function base_url() {
    if (K('BASE_URL')) return rtrim(K('BASE_URL'), '/');
    $host = preg_replace('/[^a-z0-9.\-:]/i', '', (string)g($_SERVER, 'HTTP_HOST', 'kvn.kiev.ua'));
    return 'https://' . $host . '/nedozvon';
}
function go_link($orderId) { return base_url() . '/go.php?o=' . token($orderId); }

/* ================= Телефон ================= */
/** Український мобільний → 380XXXXXXXXX або '' */
function norm_phone($p) {
    $d = preg_replace('/\D/', '', (string)$p);
    if (strlen($d) === 10 && $d[0] === '0') $d = '38' . $d;
    if (strlen($d) === 11 && substr($d, 0, 2) === '80') $d = '3' . $d;
    return preg_match('/^380\d{9}$/', $d) ? $d : '';
}
function pretty_phone($d) { return preg_match('/^380(\d{2})(\d{3})(\d{2})(\d{2})$/', $d, $m) ? "+380 {$m[1]} {$m[2]} {$m[3]} {$m[4]}" : $d; }

/* ================= LP-CRM ================= */
function crm($method, $params = []) {
    $base = K('LPCRM_BASE') ?: 'https://' . preg_replace('~^https?://|/.*$~', '', K('LPCRM_DOMAIN'));
    if (!K('LPCRM_KEY') || $base === 'https://') return [];
    $url = rtrim($base, '/') . '/api/' . $method . '.html';
    $gap = K('LPCRM_BASE') ? 0 : (float)S('lpcrm_gap', 2);   // LP-CRM обмежує частоту запитів (HTTP 429)
    for ($try = 0; $try < 3; $try++) {
        // пауза між запитами — спільна для всіх процесів бота
        $tf = store_file('cache', 'lpcrm-last');
        $fp = @fopen($tf, 'c+');
        if ($fp) flock($fp, LOCK_EX);
        $last = $fp ? (float)stream_get_contents($fp) : 0;
        $wait = $last + $gap - microtime(true);
        if ($wait > 0) usleep((int)($wait * 1e6));
        $r = http_post($url, http_build_query(['key' => K('LPCRM_KEY')] + $params));
        if ($fp) { ftruncate($fp, 0); rewind($fp); fwrite($fp, (string)microtime(true)); flock($fp, LOCK_UN); fclose($fp); }
        $code = (int)g($GLOBALS['NZ_HTTP'], 'code');
        $j = json_decode($r, true);
        if (is_array($j) && g($j, 'status') === 'ok') return $j;
        if ($code !== 429 || !$gap) break;
        sleep(3 + 3 * $try);                       // LP-CRM просить почекати — чекаємо й пробуємо ще
    }
    $GLOBALS['NZ_CRM_ERR'] = ['method' => $method, 'url' => $url, 'http' => $code, 'curl' => g($GLOBALS['NZ_HTTP'], 'error'),
                              'resp' => cut(str_replace(K('LPCRM_KEY'), '***', strip_tags($r)), 300)];
    nz_log('crm_error', $GLOBALS['NZ_CRM_ERR']);
    return is_array($j) ? $j : [];
}
/** Статуси CRM: id => назва (кеш на 1 годину) */
function crm_statuses() {
    static $memo = null;                      // в межах одного запиту питаємо LP-CRM лише раз
    if ($memo !== null) return $memo;
    $memo = crm_statuses_fetch();
    return $memo;
}
function crm_statuses_fetch() {
    $c = load('cache', 'statuses');
    if (g($c, 'ts', 0) > time() - 3600 && g($c, 'data')) return $c['data'];
    $r = crm('getStatuses');
    $data = (array)g($r, 'data', []);
    if ($data) save('cache', 'statuses', ['ts' => time(), 'data' => $data]);
    return $data ?: (array)g($c, 'data', []);
}
/** Статус замовлення ($val — ID або назва) збігається з ID $sid? */
function status_is($val, $sid) {
    $val = (string)$val;
    if ($val === '' || $sid === '') return false;
    if ($val === (string)$sid) return true;
    $n = g(crm_statuses(), $sid, '');
    return $n !== '' && status_key($val) === status_key($n);
}
function status_key($name) { return trim(preg_replace('/[^\p{L}\p{N} ]+/u', '', mb_strtolower((string)$name, 'UTF-8'))); }
/** ID статусу за назвою (точний збіг, потім — «містить») */
function status_id($name) {
    if ($name === '' || $name === null) return '';
    if (ctype_digit((string)$name)) return (string)$name;
    $want = status_key($name); $part = '';
    foreach (crm_statuses() as $id => $n) {
        $k = status_key($n);
        if ($k === $want) return (string)$id;
        if (!$part && $want !== '' && (strpos($k, $want) !== false || strpos($want, $k) !== false) && $k !== '') $part = (string)$id;
    }
    return $part;
}
/** Замовлення з LP-CRM у простому вигляді */
/** Шукає поле в замовленні: спершу за точними назвами, потім за частиною назви (рекурсивно) */
function find_field($o, $exact, $parts, $validate = null) {
    foreach ($exact as $k) if (isset($o[$k]) && !is_array($o[$k]) && trim((string)$o[$k]) !== '' && (!$validate || $validate($o[$k]))) return (string)$o[$k];
    $stack = [$o];
    while ($stack) {
        $cur = array_pop($stack);
        foreach ((array)$cur as $k => $v) {
            if (is_array($v)) { if ($k !== 'products') $stack[] = $v; continue; }
            foreach ($parts as $p) if (stripos((string)$k, $p) !== false && trim((string)$v) !== '' && (!$validate || $validate($v))) return (string)$v;
        }
    }
    return '';
}
/** Структура відповіді без персональних даних: назви полів і тип/довжина значень */
function shape($v, $depth = 0) {
    if (is_array($v)) {
        if ($depth > 3) return '[…]';
        $out = []; $i = 0;
        foreach ($v as $k => $x) { if ($i++ >= 40) { $out['…'] = '…'; break; } $out[$k] = shape($x, $depth + 1); }
        return $out;
    }
    if ($v === null || $v === '') return '(порожньо)';
    $str = (string)$v;
    if (norm_phone($str)) return 'телефон ✓ (' . strlen(preg_replace('/\D/', '', $str)) . ' цифр)';
    return (is_numeric($str) ? 'число' : 'текст') . ' ' . (function_exists('mb_strlen') ? mb_strlen($str, 'UTF-8') : strlen($str)) . ' симв.';
}
function crm_order($orderId) {
    $r = crm('getOrdersByID', ['order_id' => $orderId]);
    $data = g($r, 'data', []);
    if (is_string($data) && ($d = json_decode($data, true))) $data = $d;
    $GLOBALS['NZ_ORDER_RAW'] = $r;
    if (!is_array($data) || !$data) return [];
    // LP-CRM: для одного замовлення data — саме замовлення; для кількох — {order_id: замовлення}
    $o = [];
    if (array_key_exists('order_id', $data) || array_key_exists('phone', $data) || array_key_exists('bayer_name', $data)) {
        $o = $data;
    } else {
        foreach ($data as $k => $row) {
            if (!is_array($row)) continue;
            if ((string)$k === (string)$orderId || (string)g($row, 'order_id') === (string)$orderId) { $o = $row; break; }
            if (!$o) $o = $row;
        }
    }
    if (!$o) return [];
    $items = []; $sum = 0;
    foreach ((array)g($o, 'products', []) as $p) {
        if (!is_array($p)) continue;
        $title = g($p, 'name') ?: (g($p, 'title') ?: (g($p, 'product_name') ?: (g($p, 'product_title') ?: 'Товар')));
        $count = (int)(g($p, 'count') ?: (g($p, 'quantity') ?: 1));
        $price = (float)str_replace(',', '.', (string)g($p, 'price', 0));
        $items[] = ['id' => (string)g($p, 'product_id'), 'title' => trim(strip_tags((string)$title)), 'count' => $count, 'price' => $price];
        $sum += $price * $count;
    }
    $total = (float)(g($o, 'total') ?: (g($o, 'summ') ?: (g($o, 'sum') ?: $sum)));
    return [
        'order_id' => (string)$orderId,
        'num'      => (string)(g($o, 'id') ?: $orderId),
        'status'   => (string)g($o, 'status'),
        'name'     => trim(find_field($o, ['bayer_name', 'buyer_name', 'fio', 'name', 'client_name'], ['bayer', 'buyer', 'fio', 'client'])),
        'phone'    => find_field($o, ['phone', 'bayer_phone', 'phone_number', 'tel'], ['phone', 'tel'], 'norm_phone'),
        'comment'  => (string)g($o, 'comment'),
        'ttn'      => (string)g($o, 'ttn'),
        'items'    => $items,
        'total'    => round($total, 2),
        'raw'      => $o,
    ];
}
/** ID замовлень у статусі за останні lookback_days днів (кінець періоду — завтра, щоб захопити й сьогоднішні) */
function crm_ids_by_status($sid) {
    $r = crm('getOrdersIdByStatus', ['status' => $sid, 'date_start' => date('Y-m-d', strtotime('-' . (int)S('lookback_days', 2) . ' days')), 'date_end' => date('Y-m-d', strtotime('+1 day'))]);
    $GLOBALS['NZ_IDS_RAW'] = $r;
    $ids = [];
    foreach ((array)g($r, 'data', []) as $k => $v) {
        $id = is_array($v) ? (g($v, 'order_id') ?: g($v, 'id')) : $v;
        if (preg_match('/^\d{1,20}$/', (string)$id)) $ids[] = (string)$id;
    }
    return array_values(array_unique($ids));
}
function crm_update($orderId, $fields) {
    if (!S('lpcrm_update_method')) return false;
    $r = crm(S('lpcrm_update_method', 'updateOrder'), ['order_id' => $orderId] + $fields);
    return g($r, 'status') === 'ok';
}
function money($v) { return rtrim(rtrim(number_format((float)$v, 2, '.', ''), '0'), '.'); }
function items_text($o) {
    $out = [];
    foreach ($o['items'] as $i) $out[] = '• ' . $i['title'] . ($i['count'] > 1 ? ' × ' . $i['count'] : '') . ' — ' . money($i['price'] * $i['count']) . ' грн';
    return implode("\n", $out);
}
function order_photo($o) {
    $ph = (array)S('product_photos', []);
    foreach ($o['items'] as $i) if (!empty($ph[$i['id']])) return $ph[$i['id']];
    return '';
}

/* ================= SMS + Viber через TurboSMS ================= */
function send_sms($phone, $orderId, $o) {
    $link = go_link($orderId);
    $repl = ['{id}' => $o['num'], '{link}' => $link, '{products}' => items_text($o), '{total}' => money($o['total'])];
    $body = ['recipients' => [$phone]];
    if (K('SMS_SENDER')) $body['sms'] = ['sender' => K('SMS_SENDER'), 'text' => strtr(S('sms_text'), $repl)];
    if (K('VIBER_SENDER')) {
        $body['viber'] = ['sender' => K('VIBER_SENDER'), 'text' => strtr(S('viber_text'), $repl), 'caption' => S('viber_button'), 'action' => $link, 'ttl' => 3600];
        if ($img = order_photo($o)) $body['viber']['image_url'] = $img;
    }
    if (!isset($body['sms']) && !isset($body['viber'])) return ['ok' => false, 'error' => 'no sender'];
    $api = rtrim(K('TURBOSMS_API') ?: 'https://api.turbosms.ua', '/') . '/message/send.json';
    $send = function ($b) use ($api) {
        $r = post_json($api, $b, ['Authorization: Bearer ' . K('TURBOSMS_TOKEN')]);
        $code = (int)g($r, 'response_code', -1);
        $ids = [];
        foreach ((array)g($r, 'response_result', []) as $x) if (is_array($x) && g($x, 'message_id')) $ids[] = (string)$x['message_id'];
        return ['ok' => in_array($code, [0, 800, 801, 802, 803], true), 'code' => $code, 'status' => g($r, 'response_status'), 'ids' => $ids,
                'result' => cut(json_encode(g($r, 'response_result', null), JSON_UNESCAPED_UNICODE), 300)];
    };
    $res = $send($body);
    // Ім'я відправника не підійшло для одного з каналів — пробуємо окремо: спершу Viber, потім SMS
    if (!$res['ok'] && isset($body['sms'], $body['viber']) && in_array($res['code'], [302, 303, 304], true)) {
        foreach (['viber', 'sms'] as $only) {
            $b = ['recipients' => $body['recipients'], $only => $body[$only]];
            $r2 = $send($b);
            nz_log('sms_fallback', ['only' => $only, 'code' => $r2['code'], 'status' => $r2['status']]);
            if ($r2['ok']) { $r2['channel'] = $only; return $r2; }
        }
    }
    return $res;
}

/** Статус доставки SMS/Viber у TurboSMS за message_id */
function sms_status($ids) {
    if (!$ids) return [];
    $api = rtrim(K('TURBOSMS_API') ?: 'https://api.turbosms.ua', '/') . '/message/status.json';
    $r = post_json($api, ['messages' => array_values($ids)], ['Authorization: Bearer ' . K('TURBOSMS_TOKEN')]);
    $out = [];
    foreach ((array)g($r, 'response_result', []) as $x) if (is_array($x)) $out[] = array_intersect_key($x, array_flip(['message_id', 'status', 'type', 'sent', 'updated', 'rate', 'reason', 'response_status']));
    return $out ?: ['raw' => cut(json_encode($r, JSON_UNESCAPED_UNICODE), 300)];
}

/* ================= Нова пошта ================= */
function np($model, $method, $props = []) {
    $api = K('NP_API') ?: 'https://api.novaposhta.ua/v2.0/json/';
    $r = post_json($api, ['apiKey' => K('NP_KEY'), 'modelName' => $model, 'calledMethod' => $method, 'methodProperties' => (object)$props]);
    if (!g($r, 'success')) nz_log('np_error', ['m' => "$model.$method", 'errors' => g($r, 'errors', [])]);
    return $r;
}
function np_cities($q) {
    $r = np('Address', 'getCities', ['FindByString' => $q, 'Limit' => '8', 'Page' => '1']);
    $out = [];
    foreach ((array)g($r, 'data', []) as $c) {
        $type = g($c, 'SettlementTypeDescription');
        $out[] = ['ref' => $c['Ref'], 'name' => ($type && mb_strpos($type, 'міст') === false ? mb_substr($type, 0, 1) . '. ' : '') . $c['Description'] . (g($c, 'AreaDescription') ? ' (' . $c['AreaDescription'] . ' обл.)' : '')];
    }
    return $out;
}
function np_warehouses($cityRef, $q) {
    $q = trim($q);
    $p = ['CityRef' => $cityRef, 'Limit' => '8', 'Page' => '1'];
    if (preg_match('/^\D*(\d{1,5})\D*$/u', $q, $m)) $p['WarehouseId'] = $m[1]; else $p['FindByString'] = $q;
    $r = np('Address', 'getWarehouses', $p);
    $out = [];
    foreach ((array)g($r, 'data', []) as $w) $out[] = ['ref' => $w['Ref'], 'name' => $w['Description']];
    return $out;
}
/** Дані відправника (кеш на добу) */
function np_sender() {
    $c = load('cache', 'np-sender');
    if (g($c, 'ts', 0) > time() - 86400 && g($c, 'ref')) return $c;
    $t = np_template();
    $GLOBALS['NZ_NP_SENDER_WHY'] = '';
    $cp = g($t, 'sender') ? ['Ref' => $t['sender'], 'Description' => g($t, 'sender_name')]
        : g(g(np('Counterparty', 'getCounterparties', ['CounterpartyProperty' => 'Sender', 'Page' => '1']), 'data', []), 0, []);
    if (!g($cp, 'Ref')) { $GLOBALS['NZ_NP_SENDER_WHY'] = 'не знайдено контрагента-відправника'; return []; }
    $contact = g($t, 'contact') ? ['Ref' => $t['contact'], 'Phones' => g($t, 'phone')]
        : g(g(np('Counterparty', 'getCounterpartyContactPersons', ['Ref' => $cp['Ref'], 'Page' => '1']), 'data', []), 0, []);
    if (trim((string)S('np_sender_city')) === '' && g($t, 'city') && g($t, 'address')) {
        $cityRef = $t['city']; $whRef = $t['address']; $desc = trim(g($t, 'city_name') . ', ' . g($t, 'address_name'), ', ') ?: 'як в останній ТТН';
    } elseif (trim((string)S('np_sender_city')) !== '') {
        $city = g(np_cities(S('np_sender_city')), 0, []);
        $wh = $city ? g(np_warehouses($city['ref'], (string)S('np_sender_warehouse')), 0, []) : [];
        $cityRef = g($city, 'ref'); $whRef = g($wh, 'ref'); $desc = g($city, 'name') . ', ' . g($wh, 'name');
    } else {
        // Місто й відділення не вказані — беремо адресу відправника з кабінету НП (ту, з якої вже відправляли)
        $a = g(g(np('Counterparty', 'getCounterpartyAddresses', ['Ref' => $cp['Ref'], 'CounterpartyProperty' => 'Sender']), 'data', []), 0, []);
        $cityRef = g($a, 'CityRef'); $whRef = g($a, 'Ref'); $desc = trim(g($a, 'CityDescription') . ', ' . g($a, 'Description'), ', ');
    }
    $s = ['ts' => time(), 'ref' => $cp['Ref'], 'contact' => g($contact, 'Ref'), 'phone' => norm_phone(g($contact, 'Phones')),
          'city' => $cityRef, 'address' => $whRef, 'desc' => $desc, 'name' => g($cp, 'Description')];
    if (!$s['phone'] && g($t, 'phone')) $s['phone'] = norm_phone($t['phone']);
    if (!$s['contact'] || !$s['city'] || !$s['address'] || !$s['phone']) {
        $miss = []; foreach (['contact' => 'контактна особа', 'city' => 'місто відправки', 'address' => 'відділення відправки', 'phone' => 'телефон відправника'] as $k => $n) if (!$s[$k]) $miss[] = $n;
        $GLOBALS['NZ_NP_SENDER_WHY'] = 'не знайдено: ' . implode(', ', $miss);
        nz_log('np_sender_incomplete', $s); return [];
    }
    save('cache', 'np-sender', $s);
    return $s;
}
/**
 * Параметри з вашої останньої ТТН у кабінеті НП (опис, вага, хто платить, вид накладеного платежу, адреса відправки),
 * щоб бот робив ТТН так само, як ваші оператори. Значення з settings.php — лише запасні. Кеш на добу.
 */
function np_template() {
    $c = load('cache', 'np-template');
    if (g($c, 'ts', 0) > time() - 86400) return (array)g($c, 'tpl', []);
    $r = np('InternetDocument', 'getDocumentList', ['DateTimeFrom' => date('d.m.Y', strtotime('-14 days')), 'DateTimeTo' => date('d.m.Y'), 'GetFullList' => '1', 'Page' => '1']);
    $docs = array_values(array_filter((array)g($r, 'data', []), function ($d) { return is_array($d) && g($d, 'Description') !== '' && (float)g($d, 'Weight', 0) > 0; }));
    usort($docs, function ($a, $b) { return strtotime(str_replace('.', '-', (string)g($b, 'DateTime'))) <=> strtotime(str_replace('.', '-', (string)g($a, 'DateTime'))); });
    $tpl = [];
    if ($d = g($docs, 0, [])) {
        $back = 0;
        foreach (['BackwardDeliverySum', 'BackwardDeliveryMoney', 'RedeliverySum', 'RedeliveryAmount'] as $k) $back = max($back, (float)g($d, $k, 0));
        $tpl = [
            'from'        => (string)g($d, 'IntDocNumber', g($d, 'Number')),
            'description' => (string)$d['Description'],
            'weight'      => (string)$d['Weight'],
            'payer'       => in_array(g($d, 'PayerType'), ['Sender', 'Recipient'], true) ? $d['PayerType'] : '',
            'cod'         => (float)g($d, 'AfterpaymentOnGoodsCost', 0) > 0 ? 'afterpayment' : ($back > 0 || (int)g($d, 'Redelivery', 0) === 1 ? 'backward' : ''),
            'city'        => (string)g($d, 'CitySender'),
            'address'     => (string)g($d, 'SenderAddress'),
            'city_name'   => (string)g($d, 'CitySenderDescription'),
            'address_name'=> (string)g($d, 'SenderAddressDescription'),
            'sender'      => (string)g($d, 'Sender'),
            'sender_name' => (string)g($d, 'SenderDescription'),
            'contact'     => (string)g($d, 'ContactSender'),
            'phone'       => (string)g($d, 'SendersPhone'),
        ];
    }
    save('cache', 'np-template', ['ts' => time(), 'tpl' => $tpl]);
    return $tpl;
}
/** Створити ТТН. Повертає ['ok'=>true,'ttn'=>...] або ['ok'=>false,'error'=>...] */
function np_create_ttn($st, $o) {
    $snd = np_sender();
    if (!$snd) return ['ok' => false, 'error' => 'Не вдалося отримати дані відправника Нової пошти (перевірте API-ключ, місто й відділення в settings.php)'];
    $w = preg_split('/\s+/u', trim($st['name']));
    $rc = np('Counterparty', 'save', [
        'LastName' => $w[0], 'FirstName' => g($w, 1, $w[0]), 'MiddleName' => g($w, 2, ''),
        'Phone' => $st['phone'], 'Email' => '', 'CounterpartyType' => 'PrivatePerson', 'CounterpartyProperty' => 'Recipient',
    ]);
    $rec = g(g($rc, 'data', []), 0, []);
    $contact = g(g(g(g($rec, 'ContactPerson', []), 'data', []), 0, []), 'Ref');
    if (!g($rec, 'Ref') || !$contact) return ['ok' => false, 'error' => 'НП не створила отримувача: ' . implode('; ', (array)g($rc, 'errors', []))];
    $total = money($o['total']);
    $size = (array)S('np_size', [20, 15, 5]);
    $tpl = np_template();
    $weight = g($tpl, 'weight') ?: (string)S('np_weight', 0.5);
    $p = [
        'PayerType' => g($tpl, 'payer') ?: S('np_payer', 'Recipient'), 'PaymentMethod' => 'Cash', 'DateTime' => date('d.m.Y'),
        'CargoType' => 'Parcel', 'ServiceType' => 'WarehouseWarehouse', 'SeatsAmount' => '1',
        'Weight' => $weight, 'Description' => g($tpl, 'description') ?: S('np_description', 'Товар'), 'Cost' => $total,
        'OptionsSeat' => [['volumetricLength' => (string)$size[0], 'volumetricWidth' => (string)$size[1], 'volumetricHeight' => (string)$size[2], 'weight' => $weight]],
        'CitySender' => g($tpl, 'city') ?: $snd['city'], 'Sender' => $snd['ref'], 'SenderAddress' => g($tpl, 'address') ?: $snd['address'], 'ContactSender' => $snd['contact'], 'SendersPhone' => $snd['phone'],
        'CityRecipient' => $st['city_ref'], 'Recipient' => $rec['Ref'], 'RecipientAddress' => $st['wh_ref'], 'ContactRecipient' => $contact, 'RecipientsPhone' => $st['phone'],
        'InfoRegClientBarcodes' => (string)$o['num'],
    ];
    $cod = g($tpl, 'cod') ?: S('np_cod', 'backward');
    if ($cod === 'backward') $p['BackwardDeliveryData'] = [['PayerType' => 'Recipient', 'CargoType' => 'Money', 'RedeliveryString' => $total]];
    elseif ($cod === 'afterpayment') $p['AfterpaymentOnGoodsCost'] = $total;
    $r = np('InternetDocument', 'save', $p);
    $d = g(g($r, 'data', []), 0, []);
    if (!g($d, 'IntDocNumber')) return ['ok' => false, 'error' => 'НП не створила ТТН: ' . implode('; ', (array)g($r, 'errors', []))];
    return ['ok' => true, 'ttn' => (string)$d['IntDocNumber'], 'cost' => g($d, 'CostOnSite')];
}

/* ================= Месенджери ================= */
function tg_api($method, $params) {
    if (!K('TG_TOKEN')) return null;
    $api = K('TG_API') ?: 'https://api.telegram.org';
    $r = post_json(rtrim($api, '/') . '/bot' . K('TG_TOKEN') . '/' . $method, $params);
    if (empty($r['ok'])) nz_log('tg_error', ['method' => $method, 'error' => g($r, 'description', 'no response')]);
    return g($r, 'result', null);
}
function tg_me() {
    $c = load('cache', 'tg-me');
    if (g($c, 'username')) return $c;
    $me = (array)tg_api('getMe', []);
    if (g($me, 'username')) save('cache', 'tg-me', ['username' => $me['username'], 'name' => (string)g($me, 'first_name')]);
    return $me;
}
function tg_username() { return (string)g(tg_me(), 'username'); }
/** Назва магазину: з settings.php, інакше — назва вашого Telegram-бота */
function shop_name() { return trim((string)S('shop')) ?: (K('TG_TOKEN') ? (string)g(tg_me(), 'name', g(tg_me(), 'first_name')) : '') ?: 'Підтвердження замовлення'; }
function viber_api($method, $params) {
    if (!K('VIBER_TOKEN')) return [];
    $api = K('VIBER_API') ?: 'https://chatapi.viber.com/pa';
    $r = post_json(rtrim($api, '/') . '/' . $method, $params, ['X-Viber-Auth-Token: ' . K('VIBER_TOKEN')]);
    if ((int)g($r, 'status', -1) !== 0) nz_log('viber_error', ['method' => $method, 'resp' => $r]);
    return $r;
}
/** Повідомлення операторам (Telegram-група) */
function ops($text, $chatKey = '') {
    if (!K('TG_OPS_CHAT')) return;
    if ($chatKey) { $h = substr(md5($chatKey), 0, 8); save('map', $h, ['chat' => $chatKey]); $text .= "\n#k{$h}"; }
    tg_api('sendMessage', ['chat_id' => K('TG_OPS_CHAT'), 'text' => $text, 'disable_web_page_preview' => true]);
}

/**
 * Надіслати клієнту. $chatKey = 'tg:123' або 'vb:abc'. $buttons = [[ [текст, дані], ... ], ...]
 * Для Viber під час conversation_started повідомлення не відправляються, а збираються у $GLOBALS['NZ_OUT'].
 */
function say($chatKey, $text, $buttons = null, $photo = '') {
    list($ch, $id) = explode(':', $chatKey, 2);
    if ($ch === 'tg') {
        $kb = $buttons ? ['inline_keyboard' => array_map(function ($row) {
            return array_map(function ($b) { return ['text' => $b[0], 'callback_data' => $b[1]]; }, $row);
        }, $buttons)] : null;
        if ($photo) {
            $p = ['chat_id' => $id, 'photo' => $photo, 'caption' => cut($text, 1000)];
            if ($kb) $p['reply_markup'] = $kb;
            if (tg_api('sendPhoto', $p)) return;
        }
        $p = ['chat_id' => $id, 'text' => $text, 'disable_web_page_preview' => true];
        if ($kb) $p['reply_markup'] = $kb;
        tg_api('sendMessage', $p);
        return;
    }
    // Viber
    $msg = ['type' => 'text', 'text' => $text];
    if ($photo) $msg = ['type' => 'picture', 'text' => cut($text, 760), 'media' => $photo];
    if ($buttons) {
        $btns = [];
        foreach ($buttons as $row) foreach ($row as $b) $btns[] = [
            'Columns' => count($row) > 1 ? 3 : 6, 'Rows' => 1, 'ActionType' => 'reply', 'ActionBody' => $b[1],
            'Text' => '<font color="#ffffff">' . htmlspecialchars($b[0], ENT_QUOTES, 'UTF-8') . '</font>', 'BgColor' => '#7360f2', 'Silent' => true,
        ];
        $msg['keyboard'] = ['Type' => 'keyboard', 'DefaultHeight' => false, 'Buttons' => $btns];
    }
    if (isset($GLOBALS['NZ_OUT'])) { $GLOBALS['NZ_OUT'][] = $msg; return; }
    viber_api('send_message', ['receiver' => $id, 'sender' => ['name' => cut(shop_name(), 28)], 'min_api_version' => 3] + $msg);
}

/* ================= Сценарій розмови ================= */
function channel_name($chatKey) { return strpos($chatKey, 'tg:') === 0 ? 'Telegram' : 'Viber'; }
function first_name($full) { $w = preg_split('/\s+/u', trim((string)$full)); return count($w) > 1 ? $w[1] : $w[0]; }

/** Клієнт відкрив бота за посиланням */
function flow_start($chatKey, $tok) {
    $orderId = parse_token($tok);
    if (!$orderId) { say($chatKey, "👋 Вітаємо! Напишіть ваше питання — менеджер відповість тут.\n\nЯкщо у вас є замовлення, відкрийте бота за посиланням з SMS."); save('chats', $chatKey, ['step' => 'free']); return; }
    $o = crm_order($orderId);
    if (!$o) { say($chatKey, 'Не вдалося знайти замовлення. Напишіть сюди — менеджер допоможе 🙏'); save('chats', $chatKey, ['step' => 'free']); return; }
    $rec = load('orders', $orderId);
    $rec['chat'] = $chatKey; $rec['opened_at'] = $rec['opened_at'] ?? date('c');
    save('orders', $orderId, $rec);
    if (!empty($rec['ttn'])) {
        say($chatKey, "Ваше замовлення №{$o['num']} вже підтверджене ✅ Відправимо найближчим часом. Якщо є питання — пишіть сюди.");
        save('chats', $chatKey, ['step' => 'free', 'order' => $orderId]);
        return;
    }
    save('chats', $chatKey, ['step' => 'intro', 'order' => $orderId]);
    $hi = $o['name'] ? 'Вітаємо, ' . first_name($o['name']) . '! 👋' : 'Вітаємо! 👋';
    say($chatKey, "{$hi}\nМи не змогли до вас додзвонитися щодо замовлення №{$o['num']}:\n\n" . items_text($o)
        . "\n\n💰 Разом: " . money($o['total']) . " грн\n🚚 Доставка Новою поштою, оплата при отриманні\n\nПідтвердіть, будь ласка, замовлення 👇",
        [[['✅ Підтверджую', 'ok']], [['✏️ Змінити', 'chg'], ['❌ Скасувати', 'cancel']]], order_photo($o));
    nz_log('opened', ['order' => $orderId, 'chat' => channel_name($chatKey)]);
}

function ask_name($chatKey, $st) {
    $o = crm_order($st['order']);
    $n = $o ? $o['name'] : '';
    $btn = count(preg_split('/\s+/u', trim($n))) >= 2 ? [[['✅ ' . cut($n, 40), 'name_ok']]] : null;
    say($chatKey, "Напишіть, будь ласка, прізвище та ім'я отримувача, наприклад: Шевченко Ірина" . ($btn ? "\n\nАбо підтвердьте 👇" : ''), $btn);
}
function ask_phone($chatKey, $st) {
    $o = crm_order($st['order']);
    $p = $o ? norm_phone($o['phone']) : '';
    if ($p) say($chatKey, '📞 Номер отримувача для Нової пошти: ' . pretty_phone($p) . "\nВірно?", [[['✅ Так, вірно', 'phone_ok'], ['📱 Інший номер', 'phone_new']]]);
    else say($chatKey, '📞 Напишіть номер телефону отримувача, наприклад: 0981234567');
}
function ask_city($chatKey) { say($chatKey, '🏙 Напишіть ваше місто або село (можна перші літери), наприклад: Житомир'); }
function ask_wh($chatKey, $st) { say($chatKey, "📦 {$st['city_name']}\nНапишіть номер відділення або поштомату Нової пошти, наприклад: 5"); }
function show_summary($chatKey, $st) {
    $o = crm_order($st['order']);
    say($chatKey, "Перевірте, будь ласка 👇\n\n" . ($o ? items_text($o) . "\n💰 Разом: " . money($o['total']) . " грн (оплата при отриманні)\n\n" : '')
        . "👤 {$st['name']}\n📞 " . pretty_phone($st['phone']) . "\n🏙 {$st['city_name']}\n📦 {$st['wh_name']}",
        [[['✅ Все вірно, оформити', 'go']], [['✏️ Змінити дані', 'edit']]]);
}

/** Кнопка або текст від клієнта */
function flow_input($chatKey, $data, $text, $from = '') {
    $st = load('chats', $chatKey);
    $step = g($st, 'step', 'free');
    $text = trim((string)$text);
    $orderId = g($st, 'order');

    if ($data !== '' && !$orderId && $data !== 'help') { say($chatKey, 'Відкрийте, будь ласка, бота за посиланням з SMS 🙏'); return; }

    switch ($data) {
        case 'ok':
        case 'edit':
            $st['step'] = 'name'; save('chats', $chatKey, $st); ask_name($chatKey, $st); return;
        case 'name_ok':
            $o = crm_order($orderId);
            $st['name'] = $o ? preg_replace('/\s+/u', ' ', trim($o['name'])) : '';
            if (!$st['name']) { ask_name($chatKey, $st); return; }
            $st['step'] = 'phone'; save('chats', $chatKey, $st); ask_phone($chatKey, $st); return;
        case 'phone_ok':
            $o = crm_order($orderId);
            $st['phone'] = $o ? norm_phone($o['phone']) : '';
            if (!$st['phone']) { $st['step'] = 'phone'; save('chats', $chatKey, $st); ask_phone($chatKey, $st); return; }
            $st['step'] = 'city'; save('chats', $chatKey, $st); ask_city($chatKey); return;
        case 'phone_new':
            $st['step'] = 'phone_new'; save('chats', $chatKey, $st);
            say($chatKey, '📞 Напишіть номер телефону отримувача, наприклад: 0981234567'); return;
        case 'go':
            finalize($chatKey, $st); return;
        case 'chg':
            $st['step'] = 'free'; save('chats', $chatKey, $st);
            say($chatKey, '✍️ Напишіть, що хочете змінити у замовленні, — менеджер відповість тут найближчим часом.');
            ops("✏️ Клієнт хоче змінити замовлення №{$orderId} ({$from}, " . channel_name($chatKey) . ')', $chatKey); return;
        case 'cancel':
            say($chatKey, 'Точно скасувати замовлення? 😔', [[['Так, скасувати', 'cancel_yes'], ['Ні, залишити', 'ok']]]); return;
        case 'cancel_yes':
            $st['step'] = 'free'; save('chats', $chatKey, $st);
            $sid = status_id(S('status_cancel'));
            $o = crm_order($orderId);
            $upd = $sid ? crm_update($orderId, ['status' => $sid, 'comment' => trim(g($o, 'comment') . "\n🤖 Бот: клієнт скасував у " . channel_name($chatKey) . ' ' . date('d.m H:i'))]) : false;
            say($chatKey, "Замовлення скасовано. Якщо передумаєте — просто напишіть сюди 🙂\nЯкщо можна, напишіть, чому скасували — нам це дуже допоможе 🙏");
            ops("❌ Клієнт СКАСУВАВ замовлення №" . g($o, 'num', $orderId) . " у боті ({$from}, " . channel_name($chatKey) . ')'
                . ($upd ? "\nСтатус у CRM змінено." : "\n👉 Поставте в CRM статус «" . S('status_cancel') . "»"), $chatKey);
            return;
    }
    if (preg_match('/^c:(\d)$/', $data, $m) && $step === 'city_pick') {
        $c = g(g($st, 'opts', []), (int)$m[1], []);
        if (!$c) { ask_city($chatKey); return; }
        $st['city_ref'] = $c['ref']; $st['city_name'] = $c['name']; $st['step'] = 'wh'; unset($st['opts']);
        save('chats', $chatKey, $st); ask_wh($chatKey, $st); return;
    }
    if (preg_match('/^w:(\d)$/', $data, $m) && $step === 'wh_pick') {
        $w = g(g($st, 'opts', []), (int)$m[1], []);
        if (!$w) { ask_wh($chatKey, $st); return; }
        $st['wh_ref'] = $w['ref']; $st['wh_name'] = $w['name']; $st['step'] = 'confirm'; unset($st['opts']);
        save('chats', $chatKey, $st); show_summary($chatKey, $st); return;
    }
    if ($data === 'city_again') { $st['step'] = 'city'; save('chats', $chatKey, $st); ask_city($chatKey); return; }
    if ($data === 'wh_again') { $st['step'] = 'wh'; save('chats', $chatKey, $st); ask_wh($chatKey, $st); return; }
    if ($text === '') return;

    switch ($step) {
        case 'name':
            $n = preg_replace('/\s+/u', ' ', $text);
            if (!preg_match("/^[\\p{L}'’ʼ\\-]{2,}( [\\p{L}'’ʼ\\-]{2,}){1,2}$/u", $n)) {
                say($chatKey, "Напишіть, будь ласка, прізвище та ім'я двома словами, наприклад: Шевченко Ірина"); return;
            }
            $st['name'] = mb_convert_case($n, MB_CASE_TITLE, 'UTF-8'); $st['step'] = 'phone';
            save('chats', $chatKey, $st); ask_phone($chatKey, $st); return;
        case 'phone':
        case 'phone_new':
            $p = norm_phone($text);
            if (!$p) { say($chatKey, 'Не схоже на український номер 🤔 Напишіть, будь ласка, так: 0981234567'); return; }
            $st['phone'] = $p; $st['step'] = 'city'; save('chats', $chatKey, $st); ask_city($chatKey); return;
        case 'city':
        case 'city_pick':
            $cities = np_cities(cut($text, 50));
            if (!$cities) { say($chatKey, 'Не знайшли такий населений пункт 🤔 Перевірте назву й напишіть ще раз'); return; }
            $st['opts'] = $cities; $st['step'] = 'city_pick'; save('chats', $chatKey, $st);
            $btns = []; foreach ($cities as $i => $c) $btns[] = [[cut($c['name'], 60), "c:$i"]];
            say($chatKey, 'Оберіть населений пункт 👇', $btns); return;
        case 'wh':
        case 'wh_pick':
            $whs = np_warehouses($st['city_ref'], cut($text, 50));
            if (!$whs) { say($chatKey, 'Не знайшли таке відділення в ' . $st['city_name'] . ' 🤔 Напишіть номер ще раз', [[['🏙 Змінити місто', 'city_again']]]); return; }
            $st['opts'] = $whs; $st['step'] = 'wh_pick'; save('chats', $chatKey, $st);
            $btns = []; foreach ($whs as $i => $w) $btns[] = [[cut($w['name'], 60), "w:$i"]];
            say($chatKey, 'Оберіть відділення 👇', $btns); return;
        case 'done':
        case 'free':
        default:
            ops('💬 Повідомлення від клієнта' . ($orderId ? " (замовлення №{$orderId})" : '') . " — {$from}, " . channel_name($chatKey) . ":\n\n" . cut($text, 1500)
                . "\n\n↩️ Щоб відповісти — натисніть «Відповісти» на це повідомлення.", $chatKey);
            if ($step === 'free' || $step === 'done') say($chatKey, 'Дякуємо! Передали менеджеру — відповідь прийде сюди 💬');
            else say($chatKey, 'Скористайтеся, будь ласка, кнопками вище 👆 Або напишіть питання — менеджер відповість.');
    }
}

/** Клієнт натиснув «Оформити»: ТТН у Новій пошті → статус і дані в LP-CRM → повідомлення */
function finalize($chatKey, $st) {
    $orderId = g($st, 'order');
    foreach (['name', 'phone', 'city_ref', 'wh_ref'] as $k) if (!g($st, $k)) { $st['step'] = 'name'; save('chats', $chatKey, $st); ask_name($chatKey, $st); return; }
    $lock = lock('order-' . $orderId);
    if (!$lock) { say($chatKey, 'Оформлюємо ваше замовлення… ⏳'); return; }
    $rec = load('orders', $orderId);
    if (!empty($rec['ttn'])) { say($chatKey, 'Замовлення вже підтверджене ✅ Відправимо найближчим часом.'); return; }
    $o = crm_order($orderId);
    if (!$o) { say($chatKey, 'Не вдалося отримати замовлення 😔 Спробуйте ще раз за хвилину.', [[['🔁 Спробувати ще раз', 'go']]]); return; }

    // Якщо оператор уже обробив замовлення (статус не той, за яким бот писав) — ТТН не дублюємо
    $watchIds = array_filter(array_map('status_id', array_keys((array)S('watch', []))));
    $still = $o['status'] === '' || !$watchIds;
    foreach ($watchIds as $w) if (status_is($o['status'], $w)) $still = true;
    if ($o['ttn'] || !$still) {
        $st['step'] = 'done'; save('chats', $chatKey, $st);
        say($chatKey, "Дякуємо! ✅ Ваше замовлення вже в роботі у менеджера" . ($o['ttn'] ? "\nТТН: {$o['ttn']}" : '') . '. Якщо є питання — пишіть сюди.');
        ops("ℹ️ Клієнт підтвердив у боті замовлення №{$o['num']}, але воно вже має статус «" . g(crm_statuses(), $o['status'], $o['status']) . "» — ТТН бот НЕ створював.\n"
            . "Дані з бота: {$st['name']}, " . pretty_phone($st['phone']) . ", {$st['city_name']}, {$st['wh_name']}", $chatKey);
        return;
    }

    $addr = "{$st['city_name']}, {$st['wh_name']}";

    // ТТН створює оператор у LP-CRM (API LP-CRM не дозволяє це боту) — бот передає готові дані
    if (!S('create_ttn', false)) {
        if (!empty($rec['confirmed'])) { say($chatKey, 'Замовлення вже підтверджене ✅ Відправимо найближчим часом.'); return; }
        $rec['confirmed'] = date('c'); save('orders', $orderId, $rec);
        $st['step'] = 'done'; save('chats', $chatKey, $st);
        say($chatKey, "Дякуємо! Замовлення підтверджено ✅\n\n📦 Відправимо найближчим часом Новою поштою:\n{$addr}\n\nЯкщо будуть питання — пишіть сюди. Гарного дня! 💛");
        ops("✅ Клієнт ПІДТВЕРДИВ замовлення №{$o['num']} у боті (" . channel_name($chatKey) . ")\n\n"
            . "👤 {$st['name']}\n📞 " . pretty_phone($st['phone']) . "\n🏙 {$st['city_name']}\n📦 {$st['wh_name']}\n💰 " . money($o['total']) . " грн\n\n"
            . "👉 У LP-CRM: відкрийте замовлення №{$o['num']}, перевірте ПІБ і телефон, оберіть місто й відділення, створіть ТТН і поставте статус «" . S('status_accepted') . "».", $chatKey);
        nz_log('confirmed', ['order' => $orderId, 'num' => $o['num']]);
        return;
    }

    say($chatKey, 'Оформлюємо ваше замовлення… ⏳');
    $t = np_create_ttn($st, $o);
    if (!$t['ok']) {
        $st['step'] = 'done'; save('chats', $chatKey, $st);
        $rec['confirmed'] = date('c'); save('orders', $orderId, $rec);
        say($chatKey, "Дякуємо, замовлення підтверджено! ✅\nНомер ТТН надішлемо сюди найближчим часом 📦");
        ops("⚠️ Клієнт ПІДТВЕРДИВ замовлення №{$o['num']}, але ТТН створити не вдалося:\n{$t['error']}\n\n"
            . "Створіть вручну:\n👤 {$st['name']}\n📞 " . pretty_phone($st['phone']) . "\n📦 {$addr}\n💰 " . money($o['total']) . ' грн', $chatKey);
        nz_log('ttn_fail', ['order' => $orderId, 'error' => $t['error']]);
        return;
    }
    $rec['ttn'] = $t['ttn']; $rec['done_at'] = date('c'); save('orders', $orderId, $rec);
    $st['step'] = 'done'; save('chats', $chatKey, $st);

    $note = '🤖 Прийняв бот (' . channel_name($chatKey) . ') ' . date('d.m H:i') . ", ТТН {$t['ttn']}";
    $fields = ['bayer_name' => $st['name'], 'phone' => '+' . $st['phone'], 'delivery_adress' => 'Нова пошта: ' . $addr, 'ttn' => $t['ttn'],
               'comment' => trim($o['comment'] . "\n" . $note)];
    if ($sid = status_id(S('status_accepted'))) $fields['status'] = $sid;
    $crmOk = crm_update($orderId, $fields);

    say($chatKey, "Дякуємо! Замовлення підтверджено ✅\n\n📦 Відправимо найближчим часом Новою поштою:\n{$addr}\n\nЯкщо будуть питання — пишіть сюди. Гарного дня! 💛");
    ops("✅ Бот прийняв замовлення №{$o['num']} (" . channel_name($chatKey) . ")\n👤 {$st['name']}\n📞 " . pretty_phone($st['phone']) . "\n📦 {$addr}\n💰 " . money($o['total']) . " грн"
        . ($crmOk ? "\n🧾 ТТН: {$t['ttn']}\nLP-CRM: статус «" . S('status_accepted') . '» ✅'
                  : "\n\n👉 Відкрийте замовлення №{$o['num']} у CRM:\n1) вставте ТТН (вже створена, НЕ створюйте нову)\n2) статус «" . S('status_accepted') . "»\n\nТТН (натисніть, щоб скопіювати) 👇"), $chatKey);
    if (!$crmOk) tg_api('sendMessage', ['chat_id' => K('TG_OPS_CHAT'), 'text' => '<code>' . $t['ttn'] . '</code>', 'parse_mode' => 'HTML']);
    nz_log('done', ['order' => $orderId, 'ttn' => $t['ttn'], 'crm' => $crmOk]);
}

/** Відповідь оператора з Telegram-групи (reply на повідомлення з #k…) → клієнту */
function ops_reply($msg) {
    $rep = g($msg, 'reply_to_message', []);
    if (!$rep || !preg_match('/#k([a-f0-9]{8})/', g($rep, 'text') . ' ' . g($rep, 'caption'), $m)) return false;
    $chatKey = g(load('map', $m[1]), 'chat');
    $text = trim((string)g($msg, 'text'));
    if (!$chatKey || $text === '') return false;
    say($chatKey, $text);
    tg_api('sendMessage', ['chat_id' => K('TG_OPS_CHAT'), 'text' => '✅ Надіслано клієнту', 'reply_to_message_id' => $msg['message_id']]);
    return true;
}
