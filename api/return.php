<?php
/* Сторінка після оплати (returnUrl WayForPay): успіх / обробляється / не пройшла + підтримка */
define('APP', 1);
require __DIR__ . '/lib.php';
$s = settings();
$ref = preg_replace('/[^A-Za-z0-9_-]/', '', (string)g($_GET, 'ref', g($_POST, 'orderReference')));
$o = $ref ? order_get($ref) : [];
$st = (string)g($_POST, 'transactionStatus');
$manual = isset($_GET['manual']);

// Стан визначаємо за записом на сервері (його пише перевірений callback WayForPay), а не за POST із браузера
if (!empty($o['sp_ok'])) $state = 'ok';
elseif (!empty($o['paid'])) $state = 'prep';
elseif ($manual) $state = 'manual';
elseif (in_array($st, ['Declined', 'Expired', 'Refunded'], true)) $state = 'fail';
else $state = 'wait';
$long = !empty($o['paid']) && strtotime($o['paid']) < time() - 900; // понад 15 хв готуємо доступ

$email = g($o, 'email');
$help = $s['help_bot'];
$T = [
    'ok'     => ['🎉', 'Оплата пройшла!', 'Доступ до уроків надіслано на <b>' . h($email ?: 'вашу пошту') . '</b>.'],
    'manual' => ['🌿', 'Заявку отримано!', 'Дякую! Я напишу вам найближчим часом із посиланням на оплату й доступом.'],
    'fail'   => ['😕', 'Оплата не пройшла', 'Таке буває: банк відхилив платіж або сторінку закрили. Спробуйте ще раз або напишіть у підтримку — допоможемо.'],
    'wait'   => ['⏳', 'Перевіряємо оплату…', 'Зазвичай це кілька секунд. Сторінка оновиться сама. Якщо оплата пройшла, доступ прийде на <b>' . h($email ?: 'вашу пошту') . '</b>.'],
    'prep'   => ['🌿', 'Оплату отримано! Готуємо доступ', 'Ваш платіж пройшов ✅ Відкриваємо доступ до уроків на <b>' . h($email ?: 'вашу пошту') . '</b> — це може зайняти кілька хвилин, сторінка оновиться сама.<br><b>Будь ласка, не оплачуйте повторно.</b>' . ($long ? '<br>Якщо доступ досі не прийшов — напишіть у підтримку, ми відкриємо його вручну.' : '')],
][$state];
?><!doctype html>
<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title><?= h($T[1]) ?> · Сайт за 1 вечір з ШІ</title>
<?php if ($state === 'wait' || $state === 'prep'): ?><meta http-equiv="refresh" content="<?= $state === 'prep' ? 10 : 5 ?>"><?php endif; ?>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600&family=Manrope:wght@500;700&display=swap" rel="stylesheet">
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f3ec;font-family:Manrope,system-ui,sans-serif;color:#23302a;padding:16px}
.box{max-width:480px;width:100%;background:#fffdf9;border:1px solid #e6dfd3;border-radius:30px;padding:36px 24px;text-align:center;box-shadow:0 24px 60px -24px rgba(45,62,54,.28)}
.ico{font-size:60px}h1{font-family:"Cormorant Garamond",serif;font-size:40px;margin:8px 0 12px;line-height:1.05}p{color:#56635c;line-height:1.6}
.btn{display:block;text-decoration:none;font-weight:700;border-radius:99px;padding:16px;margin-top:12px;background:#4f6e60;color:#fff}.btn.l{background:#fff;color:#23302a;border:1px solid #e6dfd3}
small{color:#8d968f;display:block;margin-top:16px}
.where{background:#fff4e0;border:1px solid #f1d6b8;border-radius:22px;padding:18px 16px;margin:6px 0 10px}.where b{font-size:18px}.where p{margin:8px 0}
.tabs{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:10px 0 4px}.tabs span{background:#fff;border:1px solid #e6dfd3;border-radius:99px;padding:8px 12px;font-weight:700;font-size:14px}
.btn.gm{background:#c4572b}.tip{font-size:13.5px}
</style></head><body>
<div class="box">
  <div class="ico"><?= $T[0] ?></div>
  <h1><?= h($T[1]) ?></h1>
  <p><?= $T[2] ?></p>
  <?php if ($state === 'ok' || $state === 'prep'): ?>
  <div class="where">
    <b>📩 Де шукати лист з доступом</b>
    <p>Gmail часто кладе його не у «Вхідні». Перевірте <u>всі</u> папки:</p>
    <div class="tabs"><span>🔔 Сповіщення</span><span>🏷 Промоакції</span><span>⚠️ Спам</span></div>
    <a class="btn gm" href="https://mail.google.com/mail/u/0/#search/in%3Aanywhere+newer_than%3A1d" target="_blank" rel="noopener">🔎 Знайти лист у Gmail</a>
    <p class="tip">Знайшли у «Спамі» чи «Сповіщеннях»? Натисніть «Не спам» або перетягніть лист у «Основні» — так наступні листи прийдуть одразу у «Вхідні».<br>Немає листа за 15 хвилин — напишіть у підтримку.</p>
  </div>
  <?php endif; ?>
  <?php if ($state === 'fail'): ?><a class="btn" href="/#pricing">Спробувати ще раз</a><?php endif; ?>
  <a class="btn<?= $state === 'fail' ? ' l' : '' ?>" href="<?= h($help) ?>" target="_blank" rel="noopener">💬 Написати в підтримку</a>
  <a class="btn l" href="/">← На сайт</a>
  <?php if ($ref): ?><small>Номер замовлення: <?= h($ref) ?></small><?php endif; ?>
</div>
<?php if ($state === 'ok' || $state === 'prep'): ?>
<script src="/js/config.js"></script>
<script>
(function(){var C=window.SITE_CONFIG||{};if(!C.metaPixelId)return;
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init',C.metaPixelId);fbq('track','Purchase',{value:<?= (float)$s['price'] ?>,currency:'<?= h($s['currency']) ?>'},{eventID:'<?= h($ref) ?>'});})();
</script>
<?php endif; ?>
</body></html>
