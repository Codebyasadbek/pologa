<?php
// Приём заявок с сайта. Заполните настройки ниже.
const MAIL_TO    = '';  // TODO: почта для заявок (основной канал)
const TG_TOKEN   = '';  // TODO: токен бота от @BotFather (необязательно)
const TG_CHAT_ID = '';  // TODO: id чата, куда слать заявки
const SITE_NAME  = 'Строительные полога';

header('Content-Type: application/json; charset=utf-8');

function reply(bool $ok, int $code = 200): void
{
    http_response_code($code);
    echo json_encode(['ok' => $ok]);
    exit;
}

function field(string $key, int $max = 200): string
{
    $value = trim(strip_tags((string)($_POST[$key] ?? '')));
    return mb_substr($value, 0, $max);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    reply(false, 405);
}
// Скрытое поле заполняют только боты
if (field('website') !== '') {
    reply(true);
}

$phone = field('phone', 30);
if (strlen(preg_replace('/\D/', '', $phone)) !== 11) {
    reply(false, 422);
}

$length = field('length', 10);
$width  = field('width', 10);

$rows = [
    'Форма'      => field('form', 50),
    'Имя'        => field('name', 100),
    'Телефон'    => $phone,
    'Материал'   => field('material', 50),
    'Плотность'  => field('grade', 50),
    'Тип'        => field('type', 50),
    'Размер'     => ($length !== '' && $width !== '') ? "$length × $width м" : '',
    'Количество' => field('qty', 10),
    'Площадь'    => field('area', 20),
    'Люверсы'    => field('grommets', 10),
    'Оценка'     => field('estimate', 30),
    'UTM'        => field('utm', 500),
    'Страница'   => field('page', 300),
];

$lines = ['Новая заявка: ' . SITE_NAME];
foreach ($rows as $name => $value) {
    if ($value !== '') {
        $lines[] = "$name: $value";
    }
}
$text = implode("\n", $lines);

$sent = false;

if (MAIL_TO !== '') {
    $subject = '=?UTF-8?B?' . base64_encode('Заявка с сайта: ' . SITE_NAME) . '?=';
    $headers = "Content-Type: text/plain; charset=utf-8\r\n";
    $sent = mail(MAIL_TO, $subject, $text, $headers) || $sent;
}

if (TG_TOKEN !== '' && TG_CHAT_ID !== '') {
    $ch = curl_init('https://api.telegram.org/bot' . TG_TOKEN . '/sendMessage');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => ['chat_id' => TG_CHAT_ID, 'text' => $text],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 10,
    ]);
    $result = json_decode((string)curl_exec($ch), true);
    curl_close($ch);
    $sent = !empty($result['ok']) || $sent;
}

// Резервная копия каждой заявки, папка закрыта от просмотра через .htaccess
$dir = __DIR__ . '/leads';
if (!is_dir($dir)) {
    @mkdir($dir, 0750);
}
$logged = @file_put_contents($dir . '/leads.log', date('Y-m-d H:i:s') . "\n" . $text . "\n\n", FILE_APPEND | LOCK_EX) !== false;

reply($sent || $logged);
