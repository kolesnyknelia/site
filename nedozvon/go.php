<?php
/* Сторінка з SMS: пояснює простими словами, що сталося, показує замовлення й веде в Telegram/Viber.
   Для тих, кому незручно в месенджері, — кнопка «Передзвоніть мені». */
define('NZ', 1);
require __DIR__ . '/lib.php';
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex');
$tok = (string)g($_GET, 'o');
$id = parse_token($tok);
$tg = K('TG_TOKEN') ? tg_username() : '';
$vb = K('VIBER_URI');
$o = $id ? crm_order($id) : [];
$called = false;
if ($id && isset($_GET['call'])) {
    $rec = load('orders', $id);
    if (empty($rec['call_req'])) {
        $rec['call_req'] = date('c'); save('orders', $id, $rec);
        ops("📞 Клієнт просить ПЕРЕДЗВОНИТИ (натиснув на сторінці з SMS)\nЗамовлення №" . g($o, 'num', $id)
            . ($o ? "\n👤 " . $o['name'] . "\n📞 " . pretty_phone(norm_phone($o['phone'])) : ''));
        nz_log('call_request', ['order' => $id]);
    }
    $called = true;
} elseif ($id) nz_log('go', ['order' => $id]);
function e($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
$first = $o && $o['name'] ? first_name($o['name']) : '';
?><!doctype html>
<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Підтвердження замовлення</title>
<style>
body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f3ef;color:#222;font-size:18px}
.c{background:#fff;max-width:420px;margin:16px auto;padding:24px 20px;border-radius:18px;box-shadow:0 6px 24px rgba(0,0,0,.08)}
h1{font-size:24px;margin:0 0 12px}p{margin:0 0 14px;line-height:1.5}
.o{background:#f7f5f0;border-radius:12px;padding:14px 16px;margin:0 0 16px;line-height:1.6}
.o b{font-size:20px}
ol{padding-left:22px;margin:0 0 18px;line-height:1.55}li{margin-bottom:6px}
a.b{display:block;text-align:center;padding:18px;border-radius:14px;color:#fff;text-decoration:none;font-weight:700;font-size:19px;margin-top:12px}
.tg{background:#2aabee}.vb{background:#7360f2}.call{background:#fff;color:#333!important;border:2px solid #ccc}
.small{color:#777;font-size:15px;text-align:center;margin-top:16px}
</style></head><body><div class="c">
<?php if (!$id): ?>
<h1>Посилання недійсне</h1><p>Перевірте, будь ласка, посилання з SMS.</p>
<?php elseif ($called): ?>
<h1>Дякуємо! 🙏</h1>
<p>Менеджер передзвонить вам найближчим часом, щоб підтвердити замовлення. Тримайте, будь ласка, телефон поруч.</p>
<?php else: ?>
<h1>Вітаємо<?= $first ? ', ' . e($first) : '' ?>! 👋</h1>
<p>Ви оформили у нас замовлення. Ми вам телефонували, але не змогли додзвонитися.</p>
<?php if ($o && $o['items']): ?>
<div class="o">
<?php foreach ($o['items'] as $i): ?>• <?= e($i['title']) ?><?= $i['count'] > 1 ? ' × ' . (int)$i['count'] : '' ?><br><?php endforeach; ?>
Разом: <b><?= e(money($o['total'])) ?> грн</b>
</div>
<?php endif; ?>
<p><b>Щоб ми відправили замовлення</b>, потрібно лише підтвердити, куди його надіслати. Це займе 1 хвилину:</p>
<ol>
<li>Натисніть синю кнопку нижче.</li>
<li>Відкриється Telegram — натисніть <b>«Почати»</b> (або «Start»).</li>
<li>Дайте відповідь на кілька простих питань: ім'я, місто, відділення Нової пошти.</li>
</ol>
<?php if ($tg): ?><a class="b tg" href="https://t.me/<?= e($tg) ?>?start=<?= e($tok) ?>">✅ Підтвердити замовлення в Telegram</a><?php endif; ?>
<?php if ($vb): ?><a class="b vb" href="viber://pa?chatURI=<?= e(rawurlencode($vb)) ?>&amp;context=<?= e($tok) ?>">✅ Підтвердити у Viber</a><?php endif; ?>
<a class="b call" href="?o=<?= e(rawurlencode($tok)) ?>&amp;call=1">📞 Немає Telegram — передзвоніть мені</a>
<p class="small">Якщо замовлення вже не актуальне — просто проігноруйте це повідомлення.</p>
<?php endif; ?>
</div></body></html>
