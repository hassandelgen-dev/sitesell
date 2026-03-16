const MIN_FILL_MS = 2500;

function getAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin") || "";
  if (!origin) return "*";

  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!allowed.length) return origin;
  return allowed.includes(origin) ? origin : "";
}

function buildCorsHeaders(request, env) {
  const allowedOrigin = getAllowedOrigin(request, env);
  const headers = {
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };

  if (allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
    headers["Vary"] = "Origin";
  }

  return headers;
}

function jsonResponse(request, env, status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...buildCorsHeaders(request, env),
    },
  });
}

function isSpamLike(honeypot, loadedAt) {
  if (String(honeypot || "").trim()) return true;

  const ts = Number(loadedAt || 0);
  if (!Number.isFinite(ts) || ts <= 0) return false;
  const elapsed = Date.now() - ts;
  return elapsed < MIN_FILL_MS;
}

function buildTelegramText(sessionId, type, payload) {
  const lines = [
    "📩 Новое сообщение в чат поддержки",
    `ID сессии: ${sessionId}`,
    `Тип: ${type}`,
    `Дата: ${new Date().toLocaleString("uk-UA")}`,
    "",
  ];

  Object.entries(payload).forEach(([key, value]) => {
    lines.push(`${key}: ${value || "—"}`);
  });

  return lines.join("\n");
}

function generateSessionId() {
  return "sess_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
}

async function saveMessage(env, sessionId, message) {
  if (!env.CHATS) return false;
  
  const key = `session:${sessionId}`;
  const data = await env.CHATS.get(key, "json") || { messages: [], createdAt: Date.now() };
  data.messages.push(message);
  await env.CHATS.put(key, JSON.stringify(data), { expirationTtl: 86400 * 7 });
  return true;
}

async function getMessages(env, sessionId) {
  if (!env.CHATS) return [];
  
  const key = `session:${sessionId}`;
  const data = await env.CHATS.get(key, "json") || { messages: [] };
  return data.messages || [];
}

async function addReply(env, sessionId, replyText) {
  if (!env.CHATS) return false;
  
  const key = `session:${sessionId}`;
  const data = await env.CHATS.get(key, "json") || { messages: [] };
  data.messages.push({
    id: "reply_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
    type: "bot",
    text: replyText,
    timestamp: Date.now(),
  });
  await env.CHATS.put(key, JSON.stringify(data), { expirationTtl: 86400 * 7 });
  return true;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: buildCorsHeaders(request, env) });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    // Получить сообщения сессии
    if (pathname.match(/^\/api\/telegram\/messages\/[^\/]+$/) && request.method === "GET") {
      const sessionId = pathname.split("/").pop();
      try {
        const messages = await getMessages(env, sessionId);
        return jsonResponse(request, env, 200, { ok: true, messages });
      } catch {
        return jsonResponse(request, env, 500, { ok: false, message: "Ошибка при получении сообщений" });
      }
    }

    // Отправить ответ поддержки (требует админ ключ)
    if (pathname === "/api/telegram/reply" && request.method === "POST") {
      const adminKey = request.headers.get("X-Admin-Key") || "";
      const expectedKey = env.ADMIN_KEY || "";
      
      if (!expectedKey || adminKey !== expectedKey) {
        return jsonResponse(request, env, 401, { ok: false, message: "Unauthorized" });
      }

      try {
        const body = await request.json();
        const { sessionId, reply } = body;

        if (!sessionId || !reply || typeof reply !== "string") {
          return jsonResponse(request, env, 400, { ok: false, message: "Missing sessionId or reply" });
        }

        await addReply(env, sessionId, reply);
        return jsonResponse(request, env, 200, { ok: true });
      } catch {
        return jsonResponse(request, env, 500, { ok: false, message: "Internal server error" });
      }
    }

    // Отправить новое сообщение
    if (pathname === "/api/telegram" && request.method === "POST") {
      const botToken = env.TELEGRAM_BOT_TOKEN;
      const chatId = env.TELEGRAM_CHAT_ID;
      if (!botToken || !chatId) {
        return jsonResponse(request, env, 500, { ok: false, message: "Server is not configured" });
      }

      try {
        const body = await request.json();
        const formType = body?.type;
        const payload = body?.payload;
        const honeypot = body?._hp;
        const loadedAt = body?._loadedAt;
        const sessionId = body?.sessionId || generateSessionId();

        if (!formType || !payload || typeof payload !== "object" || Array.isArray(payload)) {
          return jsonResponse(request, env, 400, { ok: false, message: "Некорректные данные формы" });
        }

        if (isSpamLike(honeypot, loadedAt)) {
          return jsonResponse(request, env, 200, { ok: true, sessionId });
        }

        // Сохранить сообщение пользователя в KV
        await saveMessage(env, sessionId, {
          id: generateSessionId(),
          type: "user",
          text: payload.Question || payload.Вопрос || JSON.stringify(payload),
          timestamp: Date.now(),
          data: payload,
        });

        // Отправить в Telegram
        const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: buildTelegramText(sessionId, formType, payload),
          }),
        });

        const telegramResult = await telegramResponse.json();
        if (!telegramResponse.ok || !telegramResult?.ok) {
          return jsonResponse(request, env, 502, {
            ok: false,
            message: "Telegram API error",
            details: telegramResult,
          });
        }

        return jsonResponse(request, env, 200, { ok: true, sessionId });
      } catch {
        return jsonResponse(request, env, 500, { ok: false, message: "Internal server error" });
      }
    }

    return jsonResponse(request, env, 404, { ok: false, message: "Not found" });
  },
};
