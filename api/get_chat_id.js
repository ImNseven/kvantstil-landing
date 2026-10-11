'use strict';
/*
 * Показывает, в каких чатах бот видел сообщения, и их ID.
 * Запуск: node api/get_chat_id.js  (токен берётся из api/.env)
 * Перед запуском: добавьте бота в группу и напишите там /start (или напишите боту в личку).
 */
const fs = require('fs');
const path = require('path');

let token = process.env.TELEGRAM_BOT_TOKEN || '';
try {
  const m = /^[ \t]*TELEGRAM_BOT_TOKEN[ \t]*=[ \t]*(\S+)[ \t]*$/m.exec(fs.readFileSync(path.join(__dirname, '.env'), 'utf8'));
  if (!token && m) token = m[1].replace(/^(['"])(.*)\1$/, '$2');
} catch (e) { /* нет .env */ }
if (!token) { console.error('Нет токена: впишите TELEGRAM_BOT_TOKEN в api/.env'); process.exit(1); }

(async () => {
  const me = await fetch('https://api.telegram.org/bot' + token + '/getMe').then(r => r.json());
  if (!me.ok) { console.error('Токен не подошёл:', me.description); process.exit(1); }
  console.log('Бот: @' + me.result.username);

  const upd = await fetch('https://api.telegram.org/bot' + token + '/getUpdates').then(r => r.json());
  if (!upd.ok) { console.error('Ошибка getUpdates:', upd.description); process.exit(1); }
  const chats = new Map();
  upd.result.forEach(u => {
    const msg = u.message || u.channel_post || u.my_chat_member || u.edited_message;
    const c = msg && msg.chat;
    if (c) chats.set(c.id, c);
  });
  if (!chats.size) {
    console.log('Сообщений пока нет. Напишите /start боту в личку или в группе, где он состоит, и запустите ещё раз.');
    return;
  }
  chats.forEach(c => {
    const name = c.title || [c.first_name, c.last_name].filter(Boolean).join(' ') || '';
    console.log(c.id + '  ' + c.type + '  ' + name + (c.username ? '  @' + c.username : ''));
  });
})();
