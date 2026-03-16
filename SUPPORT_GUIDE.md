# Гайд для техподдержки

## Как работает чат поддержки?

1. Пользователь открывает зеленую кнопку "Support" в нижнем правом углу сайта
2. Вводит свой вопрос и отправляет форму
3. Сообщение сохраняется в Cloudflare KV и отправляется в Telegram
4. Клиент делает polling каждые 3 секунды чтобы получить ответы
5. Вы отправляете ответ через API

## Как отправить ответ клиенту?

### Способ 1: Через CURL (быстро)

```bash
ADMIN_KEY="55fae8ffcfde93f1db4388628bd11bb6"
SESSION_ID="sess_1710698400000_abc12def3"
REPLY="Спасибо за ваш вопрос! Мы вам ответим в течение 2 часов."

curl -X POST https://sitemy-telegram-proxy.hassandelgen.workers.dev/api/telegram/reply \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $ADMIN_KEY" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"reply\":\"$REPLY\"}"
```

### Способ 2: Через JavaScript

```javascript
const adminKey = "55fae8ffcfde93f1db4388628bd11bb6";
const sessionId = "sess_1710698400000_abc12def3"; // получится из сообщения в Telegram
const reply = "Спасибо за вопрос! Мы вам ответим вскоре.";

fetch("https://sitemy-telegram-proxy.hassandelgen.workers.dev/api/telegram/reply", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Admin-Key": adminKey,
  },
  body: JSON.stringify({ sessionId, reply }),
})
.then(r => r.json())
.then(data => console.log(data));
```

## Где найти SESSION_ID?

Когда пользователь отправит сообщение, вы получите в Telegram уведомление:

```
📩 Новое сообщение в чат поддержки
ID сессии: sess_1710699999999_abc123ef6
Тип: Техподдержка
Дата: 17.03.2026, 20:00:00

Страница: https://...
Имя: Максим
Контакт: +380996666666
Вопрос: Как это работает?
```

**ID сессии** находится в строке `ID сессии:` - это то, что нужно использовать в reply API.

## Тестирование

### 1. Проверить что API доступен

```bash
curl https://sitemy-telegram-proxy.hassandelgen.workers.dev/api/telegram/messages/test-session
```

### 2. Отправить тестовый ответ (с правильным админ ключом)

```bash
curl -X POST https://sitemy-telegram-proxy.hassandelgen.workers.dev/api/telegram/reply \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: 55fae8ffcfde93f1db4388628bd11bb6" \
  -d '{"sessionId":"test-session","reply":"тестовый ответ"}'
```

Должна вернуться:
```json
{"ok": true}
```

## Безопасность

- **Админ ключ**: `55fae8ffcfde93f1db4388628bd11bb6`
- Храните его в безопасном месте
- Не делитесь ключом со всеми
- Каждое сообщение требует правильный ключ в заголовке `X-Admin-Key`

## Сообщения сохраняются 7 дней

Старые сообщения автоматически удаляются из KV через 7 дней.

## Поддержка

Если что-то не работает:
1. Проверьте правильность SESSION_ID
2. Убедитесь что админ ключ правильный
3. Сделайте hard refresh на сайте (Cmd+Shift+R на Mac)
4. Проверьте что Worker развернут: https://sitemy-telegram-proxy.hassandelgen.workers.dev
