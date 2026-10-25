<?php
/* =========================================================
   Відкриті налаштування оплати (без секретів).
   Секретні ключі лежать на сервері в /kvn.kiev.ua/private/config.php
   і записуються туди автоматично з GitHub Secrets (див. PAYMENTS.md).
   ========================================================= */
if (!defined('APP')) { http_response_code(404); exit; }

// Акція на дати (за київським часом) — та сама, що promo в js/config.js
$today = (new DateTime('now', new DateTimeZone('Europe/Kyiv')))->format('Y-m-d');
$promo = $today >= '2026-10-26' && $today <= '2026-10-30';

return [
    'site_url'      => 'https://kvn.kiev.ua',
    'domain'        => 'www.kvn.kiev.ua',      // домен магазину в кабінеті WayForPay
    'wfp_merchant'  => 'www_kvn_kiev_ua',      // Merchant login (не секрет); секретний ключ — у GitHub Secrets
    'product_name'  => 'Курс «Сайт за 1 вечір з ШІ»',
    'price'         => $promo ? 499 : 29,      // ціна одного пакета (у дні акції — 499 грн)
    'currency'      => $promo ? 'UAH' : 'USD', // USD / EUR / UAH
    'language'      => 'UA',
    'help_bot'      => 'https://t.me/hellppbott',
];
