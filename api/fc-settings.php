<?php
/* =========================================================
   «Формула Claude» (formulaclaude.kvn.kiev.ua) — відкриті налаштування оплати.
   На хостинг потрапляє як formulaclaude/api/settings.php (див. deploy-formulaclaude.yml).
   Секретні ключі WayForPay / Telegram / SendPulse — спільні з kvn.kiev.ua:
   /kvn.kiev.ua/private/config.php (записуються з GitHub Secrets).
   ========================================================= */
if (!defined('APP')) { http_response_code(404); exit; }

return [
    'site_url'     => 'https://formulaclaude.kvn.kiev.ua',
    'domain'       => 'formulaclaude.kvn.kiev.ua',  // має бути доданий у магазин WayForPay
    'wfp_merchant' => 'www_kvn_kiev_ua',            // Merchant login (не секрет)
    'currency'     => 'UAH',
    'language'     => 'UA',
    'help_bot'     => 'https://t.me/hellppbott',
    // Адресна книга SendPulse «Покупці Формула Claude» — число з адреси сторінки книги (не секрет).
    // Порожньо — оплата пройде, але доступ не відкриється автоматично (прийде попередження в Telegram).
    'sp_book_id'   => '',
    // Пакети: ціна в гривнях. Ціну змінювати тут І в formulaclaude/index.html (PACKS).
    'packs' => [
        'self'  => ['name' => 'Самостійно',       'price' => 2900],
        'group' => ['name' => 'З куратором',      'price' => 5900],
        'vip'   => ['name' => 'Особисто з Нелею', 'price' => 14900],
    ],
    'product_name' => 'Онлайн-курс «Формула Claude»',
];
