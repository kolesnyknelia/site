<?php
/* Спільне для ботів-продавців розмальовок (Telegram і Viber): сховище, ціни, тексти замовлення.
   Потрібні $D = require rozmalovky-data.php і lib.php. */
if (!defined('APP')) { http_response_code(404); exit; }

/* ---------- Сховище: стан розмови й замовлення (у /noosal.shop/private, поза сайтами) ---------- */
function store_path($kind, $id) {
    $d = private_dir() . '/' . $kind;
    if (!is_dir($d)) @mkdir($d, 0750, true);
    return $d . '/' . preg_replace('/[^A-Za-z0-9_\-]/', '', (string)$id) . '.json';
}
function load($kind, $id) { $f = store_path($kind, $id); return is_file($f) ? (array)json_decode((string)file_get_contents($f), true) : []; }
function save($kind, $id, $data) { @file_put_contents(store_path($kind, $id), json_encode($data, JSON_UNESCAPED_UNICODE), LOCK_EX); }

/* ---------- Тексти ---------- */
function first_name($full) { $w = preg_split('/\s+/u', trim((string)$full)); return count($w) > 1 ? $w[1] : $w[0]; }
function surname($full) { $w = preg_split('/\s+/u', trim((string)$full)); return $w[0]; }
function titles($o) {
    global $D; $names = [];
    foreach ((array)g($o, 'items', []) as $i) if (isset($D['products'][$i[0]])) $names[$D['products'][$i[0]][0]] = 1;
    $names = array_keys($names);
    if (!$names) return 'розмальовку';
    return (count($names) === 1 ? 'розмальовку «' : 'розмальовки «') . implode('», «', $names) . '»';
}
function order_lines($o, $withVariant = true) {
    global $D; $out = [];
    foreach ((array)g($o, 'items', []) as $i) if (isset($D['products'][$i[0]]))
        $out[] = '• ' . h($D['products'][$i[0]][0]) . ($withVariant ? ' — ' . $D['variants'][$i[1]] : '') . ($i[2] > 1 ? " × {$i[2]}" : '');
    return implode("\n", $out);
}
function order_count($o) { $n = 0; foreach ((array)g($o, 'items', []) as $i) $n += $i[2]; return $n; }
function help_text() {
    return "👋 Вітаємо! Це підтримка «Розмалюй момент».\n\nНапишіть сюди ваше питання — про розмальовки, доставку чи оплату — і менеджер відповість у цьому чаті 💬";
}
/** Сума за варіантами — та сама формула, що в rozmalovky-order.php */
function order_total($items) {
    global $D; $c = ['classic' => 0, 'premium' => 0];
    foreach ($items as $i) if (isset($c[$i[1]])) $c[$i[1]] += $i[2];
    $n = $c['classic'] + $c['premium'];
    if (!$n) return 0;
    $t = function ($v) use ($D, $n) { $p = $D['price'][$v]; return isset($p[$n]) ? $p[$n] : $p[3] + ($n - 3) * $D['extra'][$v]; };
    return (int)round(($c['classic'] * $t('classic') + $c['premium'] * $t('premium')) / $n);
}
function purpose($o) { return 'Оплата за товар' . (g($o, 'ref') ? ', замовлення № ' . $o['ref'] : '') . ', ' . (g($o, 'name') ? surname($o['name']) : '[ваше прізвище]'); }

/** Сума для кнопки «ще одна»: скільки додасть наступна розмальовка того ж варіанту */
function next_price($o, $v) { $more = $o['items']; $more[] = ['x', $v, 1]; return order_total($more) - (int)$o['total']; }
