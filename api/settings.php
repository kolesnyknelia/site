<?php
/* =========================================================
   Відкриті налаштування оплати (без секретів).
   Секретні ключі лежать на сервері в /kvn.kiev.ua/private/config.php
   і записуються туди автоматично з GitHub Secrets (див. PAYMENTS.md).
   ========================================================= */
if (!defined('APP')) { http_response_code(404); exit; }

return [
    'site_url'      => 'https://kvn.kiev.ua',
    'domain'        => 'kvn.kiev.ua',          // має бути підтверджений у кабінеті WayForPay
    'product_name'  => 'Курс «Сайт за 1 вечір з ШІ»',
    'price'         => 29,                     // ціна одного пакета
    'currency'      => 'USD',                  // USD / EUR / UAH
    'language'      => 'UA',
    'help_bot'      => 'https://t.me/NKolesnyk9234', // замінити на help-бота
];
