<?php
/*
 * Приём заявок с сайта и отправка в Telegram (версия для обычного PHP-хостинга, hoster.by).
 * Та же логика, что в api/server.js. Настройки (токен бота, ID чата) лежат рядом в lead-config.php,
 * он в git не попадает. Образец: lead-config.example.php.
 *
 * GET  /api/lead.php  проверка, что всё работает: {"ok":true,"configured":true}
 * POST /api/lead.php  заявка: {"lead":{...},"website":""}
 */
declare(strict_types=1);

ini_set('display_errors', '0'); // предупреждения PHP не должны портить ответ
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

const CHANNELS = ['Telegram', 'Viber', 'WhatsApp', 'Звонок'];
const MAX_BODY = 10240;

function respond(int $code, array $data): void
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

$configFile = __DIR__ . '/lead-config.php';
$config = is_file($configFile) ? require $configFile : [];
if (!is_array($config)) {
    $config = [];
}
$token = trim((string)($config['telegram_bot_token'] ?? ''));
$chatId = trim((string)($config['telegram_chat_id'] ?? ''));
$origins = array_filter(array_map(
    static fn($o) => rtrim(trim((string)$o), '/'),
    (array)($config['allowed_origins'] ?? [])
));

/* ---------- CORS и проверка, откуда пришёл запрос ---------- */
$origin = rtrim((string)($_SERVER['HTTP_ORIGIN'] ?? ''), '/');
$originOk = !$origins || in_array($origin, $origins, true);
if ($origin !== '' && $originOk) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($method === 'GET') {
    respond(200, ['ok' => true, 'configured' => $token !== '' && $chatId !== '']);
}
if ($method !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'method']);
}
if (!$originOk) {
    respond(403, ['ok' => false, 'error' => 'origin']);
}

/* ---------- защита от спама: не больше 5 заявок за 10 минут с одного адреса ---------- */
function tooMany(string $ip): bool
{
    $file = rtrim(sys_get_temp_dir(), '/\\') . '/kvantstil_leads_' . md5($ip);
    $now = time();
    $list = [];
    if (is_file($file)) {
        $saved = json_decode((string)@file_get_contents($file), true);
        if (is_array($saved)) {
            $list = array_values(array_filter($saved, static fn($t) => is_int($t) && $now - $t < 600));
        }
    }
    $list[] = $now;
    @file_put_contents($file, json_encode($list), LOCK_EX);
    return count($list) > 5;
}

// на обычном хостинге прокси нет: берём адрес соединения (X-Forwarded-For легко подделать)
$ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');
if (tooMany($ip)) {
    respond(429, ['ok' => false, 'error' => 'too_many']);
}

$raw = (string)file_get_contents('php://input', false, null, 0, MAX_BODY + 1);
if (strlen($raw) > MAX_BODY) {
    respond(413, ['ok' => false, 'error' => 'too_large']);
}
$body = json_decode($raw, true);
if (!is_array($body)) {
    respond(400, ['ok' => false, 'error' => 'bad_json']);
}

// ловушка для ботов: скрытое поле, человек его не видит и не заполняет
if (!empty($body['website'])) {
    respond(200, ['ok' => true]);
}

/* ---------- проверка заявки ---------- */
function str($v, int $max): string
{
    if (!is_string($v)) {
        return '';
    }
    $v = trim((string)preg_replace('/[\x00-\x1F\x7F]/u', ' ', $v));
    return mb_substr($v, 0, $max, 'UTF-8');
}

$l = is_array($body['lead'] ?? null) ? $body['lead'] : [];
$lead = [
    'type' => str($l['type'] ?? null, 60),
    'door' => str($l['door'] ?? null, 40),
    'sizes' => str($l['sizes'] ?? null, 120),
    'glass' => str($l['glass'] ?? null, 80),
    'hardware' => str($l['hardware'] ?? null, 80),
    'timing' => str($l['timing'] ?? null, 60),
    'name' => str($l['name'] ?? null, 40),
    'contact' => str($l['contact'] ?? null, 40),
    'channel' => str($l['channel'] ?? null, 20),
    'page' => str($l['page'] ?? null, 500),
];
if (mb_strlen($lead['name'], 'UTF-8') < 2) {
    respond(400, ['ok' => false, 'error' => 'name']);
}
if (mb_strlen($lead['contact'], 'UTF-8') < 5) {
    respond(400, ['ok' => false, 'error' => 'contact']);
}
if (!in_array($lead['channel'], CHANNELS, true)) {
    respond(400, ['ok' => false, 'error' => 'channel']);
}
foreach (['type', 'door', 'sizes', 'glass', 'hardware', 'timing'] as $key) {
    if ($lead[$key] === '') {
        respond(400, ['ok' => false, 'error' => 'fields']);
    }
}

/* ---------- текст для Telegram ---------- */
function h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

// Откуда пришёл человек: метки рекламы из адреса страницы
function source(string $page): string
{
    $query = (string)parse_url($page, PHP_URL_QUERY);
    if ($query === '') {
        return '';
    }
    parse_str($query, $p);
    if (!empty($p['gclid'])) {
        $campaign = (isset($p['utm_campaign']) && is_string($p['utm_campaign'])) ? $p['utm_campaign'] : '';
        return 'Google Ads' . ($campaign !== '' ? ', ' . $campaign : '');
    }
    $parts = [];
    foreach (['utm_source', 'utm_medium', 'utm_campaign'] as $k) {
        if (!empty($p[$k]) && is_string($p[$k])) {
            $parts[] = $p[$k];
        }
    }
    return implode(' / ', $parts);
}

// Быстрая ссылка, чтобы ответить в один клик
function replyLink(array $lead): string
{
    $digits = (string)preg_replace('/\D/', '', $lead['contact']);
    if ($lead['channel'] === 'Telegram' && preg_match('/^@([A-Za-z][A-Za-z0-9_]{4,31})$/', $lead['contact'], $m)) {
        return 'https://t.me/' . $m[1];
    }
    if ($lead['channel'] === 'Telegram' && strlen($digits) >= 10) {
        return 'https://t.me/+' . $digits;
    }
    if ($lead['channel'] === 'WhatsApp' && strlen($digits) >= 10) {
        return 'https://wa.me/' . $digits;
    }
    return '';
}

$time = (new DateTime('now', new DateTimeZone('Europe/Minsk')))->format('d.m, H:i');
$link = replyLink($lead);
$src = source($lead['page']);
$lines = [
    '<b>Заявка с сайта</b> · ' . $time,
    '',
    '<b>' . h($lead['name']) . '</b>',
    h($lead['contact']) . ' · ответить: ' . h($lead['channel'] === 'Звонок' ? 'звонком' : $lead['channel']),
];
if ($link !== '') {
    $lines[] = '<a href="' . h($link) . '">Написать в ' . h($lead['channel']) . '</a>';
}
array_push(
    $lines,
    '',
    'Тип: ' . h($lead['type']) . ', дверь: ' . h(mb_strtolower($lead['door'], 'UTF-8')),
    'Размеры: ' . h($lead['sizes']),
    'Стекло: ' . h($lead['glass']),
    'Фурнитура: ' . h($lead['hardware']),
    'Сроки: ' . h($lead['timing'])
);
if ($src !== '') {
    array_push($lines, '', 'Источник: ' . h($src));
}
$text = implode("\n", $lines);

/* ---------- отправка ---------- */
if ($token === '' || $chatId === '') {
    error_log('kvantstil lead: не заданы telegram_bot_token / telegram_chat_id в lead-config.php');
    respond(500, ['ok' => false, 'error' => 'not_configured']);
}

$payload = json_encode([
    'chat_id' => $chatId,
    'text' => $text,
    'parse_mode' => 'HTML',
    'disable_web_page_preview' => true,
], JSON_UNESCAPED_UNICODE);
$url = 'https://api.telegram.org/bot' . $token . '/sendMessage';

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
    ]);
    $response = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
} else {
    $context = stream_context_create(['http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\n",
        'content' => $payload,
        'timeout' => 10,
        'ignore_errors' => true,
    ]]);
    $response = @file_get_contents($url, false, $context);
    $status = 0;
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) {
        $status = (int)$m[1];
    }
}

$data = is_string($response) ? json_decode($response, true) : null;
if ($status !== 200 || !is_array($data) || empty($data['ok'])) {
    error_log('kvantstil lead: Telegram ответил ' . $status . ': ' . (is_array($data) ? ($data['description'] ?? '') : 'нет ответа'));
    respond(502, ['ok' => false, 'error' => 'telegram']);
}

respond(200, ['ok' => true]);
