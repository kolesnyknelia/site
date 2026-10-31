<?php
/* «Формула Claude»: сторінка після оплати (returnUrl WayForPay). На хостинг — formulaclaude/api/return.php */
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
    'manual' => ['✳️', 'Заявку отримано!', 'Дякую! Я напишу вам найближчим часом із посиланням на оплату й доступом.'],
    'fail'   => ['😕', 'Оплата не пройшла', 'Таке буває: банк відхилив платіж або сторінку закрили. Спробуйте ще раз або напишіть у підтримку — допоможемо.'],
    'wait'   => ['⏳', 'Перевіряємо оплату…', 'Зазвичай це кілька секунд. Сторінка оновиться сама. Якщо оплата пройшла, доступ прийде на <b>' . h($email ?: 'вашу пошту') . '</b>.'],
    'prep'   => ['✳️', 'Оплату отримано! Готуємо доступ', 'Ваш платіж пройшов ✅ Відкриваємо доступ до уроків на <b>' . h($email ?: 'вашу пошту') . '</b> — це може зайняти кілька хвилин, сторінка оновиться сама.<br><b>Будь ласка, не оплачуйте повторно.</b>' . ($long ? '<br>Якщо доступ досі не прийшов — напишіть у підтримку, ми відкриємо його вручну.' : '')],
][$state];
?><!doctype html>
<html lang="uk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title><?= h($T[1]) ?> · Формула Claude</title>
<?php if ($state === 'wait' || $state === 'prep'): ?><meta http-equiv="refresh" content="<?= $state === 'prep' ? 10 : 5 ?>"><?php endif; ?>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500&family=Inter:wght@300;500&display=swap" rel="stylesheet">
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#dcdcda;font-family:Inter,system-ui,sans-serif;font-weight:300;color:#1f1f1f;padding:16px}
.box{max-width:480px;width:100%;background:#f0f0ef;border:1px solid #3a3a3a;padding:36px 24px;text-align:center}
.ico{font-size:52px}h1{font-family:"Cormorant Garamond",serif;font-weight:500;font-size:40px;margin:8px 0 12px;line-height:1.05}p{color:#4a4a4a;line-height:1.6}
.btn{display:block;text-decoration:none;font-weight:500;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:15px;margin-top:12px;background:#1f1f1f;color:#f0f0ef;border:1px solid #1f1f1f}.btn.l{background:none;color:#1f1f1f;border-color:#3a3a3a}
small{color:#7a7a7a;display:block;margin-top:16px}
.where{border:1px solid #c9c9c6;padding:18px 16px;margin:6px 0 10px}.where b{font-size:17px;font-weight:500}.where p{margin:8px 0}
.tabs{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:10px 0 4px}.tabs span{border:1px solid #c9c9c6;padding:7px 11px;font-size:13px}
.btn.gm{background:#1f1f1f}.tip{font-size:13.5px}
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
  <?php if ($state === 'fail'): ?><a class="btn" href="/#packs">Спробувати ще раз</a><?php endif; ?>
  <a class="btn<?= $state === 'fail' ? ' l' : '' ?>" href="<?= h($help) ?>" target="_blank" rel="noopener">💬 Написати в підтримку</a>
  <a class="btn l" href="/">← На сайт</a>
  <?php if ($ref): ?><small>Номер замовлення: <?= h($ref) ?></small><?php endif; ?>
</div>

</body></html>
