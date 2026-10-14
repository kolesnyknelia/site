<?php
/* Сторінка після оплати (returnUrl WayForPay): успіх / обробляється / не пройшла + підтримка */
define('APP', 1);
require __DIR__ . '/lib.php';
$s = settings();
$ref = preg_replace('/[^A-Za-z0-9_-]/', '', (string)g($_GET, 'ref', g($_POST, 'orderReference')));
$o = $ref ? order_get($ref) : [];
$st = (string)g($_POST, 'transactionStatus');
$manual = isset($_GET['manual']);

if (!empty($o['paid']) || $st === 'Approved') $state = 'ok';
elseif ($manual) $state = 'manual';
elseif (in_array($st, ['Declined', 'Expired', 'Refunded'], true)) $state = 'fail';
else $state = 'wait';

$email = g($o, 'email');
$help = $s['help_bot'];
$T = [
    'ok'     => ['🎉', 'Оплата пройшла!', 'Доступ до уроків надіслано на <b>' . h($email ?: 'вашу пошту') . '</b>. Перевірте також папку «Спам» і «Промоакції».<br>Якщо за 15 хвилин листа немає — напишіть у підтримку, ми швидко допоможемо.'],
    'manual' => ['🌿', 'Заявку отримано!', 'Дякую! Я напишу вам найближчим часом із посиланням на оплату й доступом.'],
    'fail'   => ['😕', 'Оплата не пройшла', 'Таке буває: банк відхилив платіж або сторінку закрили. Спробуйте ще раз або напишіть у підтримку — допоможемо.'],
    'wait'   => ['⏳', 'Перевіряємо оплату…', 'Зазвичай це кілька секунд. Сторінка оновиться сама. Якщо оплата пройшла, доступ прийде на <b>' . h($email ?: 'вашу пошту') . '</b>.'],
][$state];
?><!doctype html>
<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title><?= h($T[1]) ?> · Сайт за 1 вечір з ШІ</title>
<?php if ($state === 'wait'): ?><meta http-equiv="refresh" content="5"><?php endif; ?>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@500;700&display=swap" rel="stylesheet">
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f3ec;font-family:Manrope,system-ui,sans-serif;color:#23302a;padding:16px}
.box{max-width:480px;width:100%;background:#fffdf9;border:1px solid #e6dfd3;border-radius:30px;padding:36px 24px;text-align:center;box-shadow:0 24px 60px -24px rgba(45,62,54,.28)}
.ico{font-size:60px}h1{font-family:"Cormorant Garamond",serif;font-size:40px;margin:8px 0 12px;line-height:1.05}p{color:#56635c;line-height:1.6}
.btn{display:block;text-decoration:none;font-weight:700;border-radius:99px;padding:16px;margin-top:12px;background:#4f6e60;color:#fff}.btn.l{background:#fff;color:#23302a;border:1px solid #e6dfd3}
small{color:#8d968f;display:block;margin-top:16px}
</style></head><body>
<div class="box">
  <div class="ico"><?= $T[0] ?></div>
  <h1><?= h($T[1]) ?></h1>
  <p><?= $T[2] ?></p>
  <?php if ($state === 'fail'): ?><a class="btn" href="/#pricing">Спробувати ще раз</a><?php endif; ?>
  <a class="btn<?= $state === 'fail' ? ' l' : '' ?>" href="<?= h($help) ?>" target="_blank" rel="noopener">💬 Написати в підтримку</a>
  <a class="btn l" href="/">← На сайт</a>
  <?php if ($ref): ?><small>Номер замовлення: <?= h($ref) ?></small><?php endif; ?>
</div>
<?php if ($state === 'ok'): ?>
<script src="/js/config.js"></script>
<script>
(function(){var C=window.SITE_CONFIG||{};if(!C.metaPixelId)return;
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init',C.metaPixelId);fbq('track','Purchase',{value:<?= (float)$s['price'] ?>,currency:'<?= h($s['currency']) ?>'});})();
</script>
<?php endif; ?>
</body></html>
