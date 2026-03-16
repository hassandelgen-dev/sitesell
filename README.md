# SiteMy — продающий сайт-визитка

Готовый одностраничный сайт для продажи услуг по разработке сайтов под ключ.

## Что внутри

- `index.html` — структура страницы
- `styles.css` — стили и адаптив
- `script.js` — калькулятор стоимости

## Быстрый запуск

```bash
cd /Users/max/Documents/SiteMy
cp .env.example .env
python3 server.py
```

Откройте: `http://localhost:4173`

Важно: не открывайте `index.html` напрямую через `file://`, иначе отправка форм в Telegram работать не будет.

## Подключение Telegram

1. Создайте бота через `@BotFather` и получите токен.
2. Узнайте `chat_id` вашего аккаунта/группы (например, через `@userinfobot`).
3. Впишите значения в `.env`:

```env
TELEGRAM_BOT_TOKEN=ваш_токен
TELEGRAM_CHAT_ID=ваш_chat_id
```

После этого формы на сайте будут отправлять заявки в Telegram через `/api/telegram`.

## GitHub Pages + Telegram (рабочий прод-вариант)

На GitHub Pages нет backend, поэтому `/api/telegram` напрямую не работает.
Используйте Cloudflare Worker как безопасный прокси (токен бота остаётся на сервере, не в браузере).

### 1) Деплой Worker

```bash
cd /Users/max/Documents/SiteMy/cloudflare
npx wrangler login
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_CHAT_ID
npx wrangler secret put ALLOWED_ORIGINS
npx wrangler deploy
```

Для `ALLOWED_ORIGINS` укажите origin сайта, например:

```text
https://hassandelgen-dev.github.io
```

После деплоя получите URL вида:

```text
https://sitemy-telegram-proxy.<your-subdomain>.workers.dev
```

### 2) Подключение endpoint для всех пользователей (рекомендуется)

Откройте `site-config.json` и укажите URL вашего Worker:

```json
{
	"apiBaseUrl": "https://sitemy-telegram-proxy.<your-subdomain>.workers.dev"
}
```

Закоммитьте и запушьте `site-config.json` в GitHub Pages.
После деплоя все посетители сайта будут отправлять заявки через Worker.

### 2.1) Быстрый локальный override (только для вашего браузера)

```js
localStorage.setItem("sitemy_api_url", "https://sitemy-telegram-proxy.<your-subdomain>.workers.dev");
location.reload();
```

### 3) Локальная разработка

Локально ничего менять не нужно: при `localhost` сайт продолжает использовать `/api/telegram`.

## Что поменять в первую очередь

1. Контакты внизу страницы (`Телефон`, `Telegram`, `Email` в `index.html`)
2. Цены пакетов (`Start`, `Business`, `Pro` в `index.html`)
3. Базовые цены калькулятора в `script.js` (`baseConfig` и `extras`, цены в грн)
4. Тексты в блоках `Hero`, `Услуги`, `Пакеты`, `FAQ`

## Рекомендация для продаж

Добавьте 3-6 реальных кейсов с цифрами (было/стало), это заметно повысит конверсию.
