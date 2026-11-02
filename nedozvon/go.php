<?php
/* Сторінка з SMS: «Оберіть, де вам зручніше підтвердити замовлення» → Telegram / Viber */
define('NZ', 1);
require __DIR__ . '/lib.php';
header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex');
$tok = (string)g($_GET, 'o');
$id = parse_token($tok);
$tg = K('TG_TOKEN') ? tg_username() : '';
$vb = K('VIBER_URI');
if ($id) nz_log('go', ['order' => $id]);
function e($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
?><!doctype html>
<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Підтвердження замовлення</title>
<style>
body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f5f3ef;color:#222;display:flex;min-height:100vh;align-items:center;justify-content:center}
.c{background:#fff;max-width:380px;width:calc(100% - 32px);padding:28px 22px;border-radius:18px;box-shadow:0 6px 24px rgba(0,0,0,.08);text-align:center}
h1{font-size:21px;margin:0 0 8px}p{color:#666;margin:0 0 22px;line-height:1.45}
a.b{display:block;padding:16px;border-radius:12px;color:#fff;text-decoration:none;font-weight:600;font-size:17px;margin-top:12px}
.tg{background:#2aabee}.vb{background:#7360f2}
</style></head><body><div class="c">
<?php if (!$id): ?>
<h1>Посилання недійсне</h1><p>Перевірте, будь ласка, посилання з SMS.</p>
<?php else: ?>
<h1><?= e(shop_name()) ?></h1>
<p>Підтвердіть ваше замовлення в 1 клік — оберіть, де вам зручніше 👇</p>
<?php if ($tg): ?><a class="b tg" href="https://t.me/<?= e($tg) ?>?start=<?= e($tok) ?>">Підтвердити в Telegram</a><?php endif; ?>
<?php if ($vb): ?><a class="b vb" href="viber://pa?chatURI=<?= e(rawurlencode($vb)) ?>&amp;context=<?= e($tok) ?>">Підтвердити у Viber</a><?php endif; ?>
<?php endif; ?>
</div></body></html>
