<?php
/*
 * Образец настроек приёма заявок. Скопируйте в lead-config.php рядом с lead.php и впишите значения.
 * lead-config.php в git не попадает. Если открыть его в браузере, он ничего не покажет.
 */
return [
    // токен бота от @BotFather
    'telegram_bot_token' => '',
    // ID чата для заявок (у группы начинается с минуса)
    'telegram_chat_id' => '',
    // адреса сайта, с которых принимаем заявки; пусто = с любого
    'allowed_origins' => ['https://dush.kvantstil.by'],
];
