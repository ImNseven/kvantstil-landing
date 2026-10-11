/*
 * Все контакты и настройки сайта в одном месте.
 * Поменяли номер или ник здесь: он обновится во всех кнопках и ссылках страницы.
 */
window.SITE_CONFIG = {
  // Телефоны: номер для ссылки (только цифры и +) и как его показывать
  phoneMain: '+375336981389',
  phoneMainText: '+375 (33) 698-13-89',
  phone2: '+375445573335',
  phone2Text: '+375 (44) 557-33-35',

  // Мессенджеры
  telegram: 'kvantstil', // ник без @
  viberPhone: '+375336981389',
  whatsappPhone: '375336981389', // без + и пробелов
  instagram: 'kvantstil.by',
  email: 'kvantstil@gmail.com',

  // Текст, который подставляется в чат (WhatsApp) или копируется (Telegram, Viber)
  defaultMessage: 'Здравствуйте! Хочу рассчитать стеклянную душевую.',

  // Куда отправлять заявки из квиза (дальше они уходят в Telegram-бот).
  // На хостинге (hoster.by): PHP-обработчик рядом с сайтом, api/lead.php.
  // Тестовая копия на Render: Node-сервер api/server.js. На своём компьютере: node api/server.js
  // Пусто = заявка никуда не уходит (демо-режим).
  leadEndpoint: /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://localhost:8787/lead'
    : /\.onrender\.com$/.test(location.hostname) ? 'https://kvantstil-api.onrender.com/lead'
    : '/api/lead.php',

  // Google Tag Manager, например 'GTM-XXXXXXX'. Пусто = аналитика не подключена.
  gtmId: '',

  // Переключатель палитр для показа клиенту: false = выключен, true = все палитры, список = только эти.
  // Клиент выбрал светлую графит и латунь (11.10), переключатель выключен.
  demoThemes: false,
  defaultTheme: 'a', // a: графит и латунь, светлая; d: то же, тёмная; b: вода; c: зелень
};
