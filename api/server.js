'use strict';
/*
 * Приём заявок с сайта и отправка в Telegram.
 * Без зависимостей: Node 18+ (встроенный fetch).
 *
 * Переменные окружения (на Render задаются в панели, локально в api/.env):
 *   TELEGRAM_BOT_TOKEN  токен бота от @BotFather
 *   TELEGRAM_CHAT_ID    куда слать заявки (ID лички или группы, у группы начинается с минуса)
 *   ALLOWED_ORIGINS     адреса сайта через запятую, например https://kvantstil-site.onrender.com
 *                       Пусто = принимаем с любого адреса.
 *   PORT                Render задаёт сам, локально 8787
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

loadEnv(path.join(__dirname, '.env'));

const TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const CHAT_ID = (process.env.TELEGRAM_CHAT_ID || '').trim();
const ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
const PORT = Number(process.env.PORT) || 8787;
const TG_API = process.env.TELEGRAM_API || 'https://api.telegram.org';

const CHANNELS = ['Telegram', 'Viber', 'WhatsApp', 'Звонок'];
const MAX_BODY = 10 * 1024;

// .env: строки КЛЮЧ=значение. Уже заданные переменные (Render) не перезаписываем
function loadEnv(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { return; }
  text.split(/\r?\n/).forEach(line => {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  });
}

/* ---------- защита от спама: не больше 5 заявок за 10 минут с одного адреса ---------- */
const hits = new Map();
function tooMany(ip) {
  const now = Date.now(), win = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter(t => now - t < win);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 5;
}

/* ---------- проверка заявки ---------- */
function str(v, max) {
  return typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '';
}

function cleanLead(raw) {
  const l = raw && typeof raw === 'object' ? raw : {};
  // короткая форма «имя + телефон» без подбора: параметров душевой в ней нет
  const short = l.form === 'short';
  const lead = {
    short,
    type: str(l.type, 60),
    door: str(l.door, 40),
    sizes: str(l.sizes, 120),
    glass: str(l.glass, 80),
    hardware: str(l.hardware, 80),
    timing: str(l.timing, 60),
    name: str(l.name, 40),
    contact: str(l.contact, 40),
    channel: str(l.channel, 20),
    page: str(l.page, 500)
  };
  if (lead.name.length < 2) return { error: 'name' };
  if (lead.contact.length < 5) return { error: 'contact' };
  if (CHANNELS.indexOf(lead.channel) === -1) return { error: 'channel' };
  if (!short && (!lead.type || !lead.door || !lead.sizes || !lead.glass || !lead.hardware || !lead.timing)) return { error: 'fields' };
  return { lead };
}

/* ---------- текст для Telegram ---------- */
function h(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Откуда пришёл человек: метки рекламы из адреса страницы
function source(page) {
  try {
    const p = new URL(page).searchParams;
    if (p.get('gclid')) return 'Google Ads' + (p.get('utm_campaign') ? ', ' + p.get('utm_campaign') : '');
    const parts = ['utm_source', 'utm_medium', 'utm_campaign'].map(k => p.get(k)).filter(Boolean);
    return parts.join(' / ');
  } catch (e) { return ''; }
}

// Быстрая ссылка, чтобы ответить в один клик
function replyLink(lead) {
  const digits = lead.contact.replace(/\D/g, '');
  const nick = /^@([A-Za-z][A-Za-z0-9_]{4,31})$/.exec(lead.contact);
  if (lead.channel === 'Telegram' && nick) return 'https://t.me/' + nick[1];
  if (lead.channel === 'Telegram' && digits.length >= 10) return 'https://t.me/+' + digits;
  if (lead.channel === 'WhatsApp' && digits.length >= 10) return 'https://wa.me/' + digits;
  return '';
}

function formatMessage(lead) {
  const time = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Minsk', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const link = replyLink(lead);
  const src = source(lead.page);
  const lines = [
    '<b>' + (lead.short ? 'Короткая заявка с сайта' : 'Заявка с сайта') + '</b> · ' + h(time),
    '',
    '<b>' + h(lead.name) + '</b>',
    h(lead.contact) + ' · ответить: ' + h(lead.channel === 'Звонок' ? 'звонком' : lead.channel)
  ];
  if (link) lines.push('<a href="' + h(link) + '">Написать в ' + h(lead.channel) + '</a>');
  if (lead.short) {
    lines.push('', 'Без подбора: имя и телефон, параметры душевой уточнить');
  } else {
    lines.push(
      '',
      'Тип: ' + h(lead.type) + ', дверь: ' + h(lead.door.toLowerCase()),
      'Размеры: ' + h(lead.sizes),
      'Стекло: ' + h(lead.glass),
      'Фурнитура: ' + h(lead.hardware),
      'Сроки: ' + h(lead.timing)
    );
  }
  if (src) lines.push('', 'Источник: ' + h(src));
  return lines.join('\n');
}

async function sendTelegram(text) {
  const r = await fetch(TG_API + '/bot' + TOKEN + '/sendMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10000)
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) throw new Error('Telegram ' + r.status + ': ' + (data.description || 'нет ответа'));
}

/* ---------- HTTP ---------- */
function cors(req, res) {
  const origin = (req.headers.origin || '').replace(/\/$/, '');
  if (!ORIGINS.length) res.setHeader('Access-Control-Allow-Origin', '*');
  else if (ORIGINS.indexOf(origin) !== -1) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  return !ORIGINS.length || ORIGINS.indexOf(origin) !== -1;
}

function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  const originOk = cors(req, res);

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  if (req.method === 'GET' && (url === '/' || url === '/health')) { send(res, 200, { ok: true }); return; }
  if (req.method !== 'POST' || url !== '/lead') { send(res, 404, { ok: false, error: 'not_found' }); return; }

  if (!originOk) { send(res, 403, { ok: false, error: 'origin' }); return; }
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (tooMany(ip)) { send(res, 429, { ok: false, error: 'too_many' }); return; }

  let body;
  try { body = JSON.parse(await readBody(req)); } catch (e) { send(res, 400, { ok: false, error: 'bad_json' }); return; }

  // ловушка для ботов: скрытое поле, человек его не видит и не заполняет
  if (body && body.website) { send(res, 200, { ok: true }); return; }

  const checked = cleanLead(body && body.lead);
  if (checked.error) { send(res, 400, { ok: false, error: checked.error }); return; }

  if (!TOKEN || !CHAT_ID) {
    console.error('Нет TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID');
    send(res, 500, { ok: false, error: 'not_configured' });
    return;
  }
  try {
    await sendTelegram(formatMessage(checked.lead));
    console.log('Заявка отправлена', new Date().toISOString());
    send(res, 200, { ok: true });
  } catch (e) {
    console.error('Не ушло в Telegram:', e.message);
    send(res, 502, { ok: false, error: 'telegram' });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log('Заявки: http://localhost:' + PORT + '/lead');
    if (!TOKEN || !CHAT_ID) console.warn('Внимание: не заданы TELEGRAM_BOT_TOKEN и/или TELEGRAM_CHAT_ID (api/.env)');
  });
}

module.exports = { formatMessage, cleanLead };
