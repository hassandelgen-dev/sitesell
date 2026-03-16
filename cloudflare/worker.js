const MIN_FILL_MS = 2500;
const SESSION_TTL_SECONDS = 86400 * 7;
const TICKETS_INDEX_KEY = "tickets:index";
const TICKETS_PAGE_SIZE = 8;

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
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Admin-Key",
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

function parseAdminIds(raw) {
  return new Set(
    String(raw || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => Number(part))
      .filter((num) => Number.isFinite(num)),
  );
}

function generateId(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function sanitizeLine(text, max = 120) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized || "—";
  return `${normalized.slice(0, max - 1)}…`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatDate(ts) {
  return new Date(ts).toLocaleString("uk-UA");
}

function buildTelegramTicketNotification(sessionId, type, payload, text) {
  return [
    "📩 <b>Новий тікет підтримки</b>",
    `🆔 <code>${escapeHtml(sessionId)}</code>`,
    `🧩 Тип: ${escapeHtml(type)}`,
    `🕒 ${escapeHtml(formatDate(Date.now()))}`,
    "",
    `👤 Ім'я: ${escapeHtml(payload?.Имя || payload?.Name || "—")}`,
    `📞 Контакт: ${escapeHtml(payload?.Контакт || payload?.Contact || "—")}`,
    `🌐 Сторінка: ${escapeHtml(payload?.Страница || payload?.Page || "—")}`,
    "",
    `💬 ${escapeHtml(sanitizeLine(text, 500))}`,
  ].join("\n");
}

function ticketButtons(sessionId) {
  return {
    inline_keyboard: [
      [{ text: "📂 Открыть тикет", callback_data: `open:${sessionId}` }],
      [{ text: "✍️ Ответить", callback_data: `reply:${sessionId}` }],
    ],
  };
}

function buildTicketListText(page, totalItems, tickets) {
  const totalPages = Math.max(1, Math.ceil(totalItems / TICKETS_PAGE_SIZE));
  const rows = tickets.length
    ? tickets
        .map((ticket, index) => {
          const number = page * TICKETS_PAGE_SIZE + index + 1;
          const name = sanitizeLine(ticket?.client?.name || "Клиент", 26);
          const last = sanitizeLine(ticket?.lastUserText || "Без сообщений", 42);
          return `${number}. ${name} — ${last}`;
        })
        .join("\n")
    : "Пока нет тикетов.";

  return [
    "📋 <b>Тикеты поддержки</b>",
    `Страница ${page + 1}/${totalPages}`,
    "",
    rows,
  ].join("\n");
}

function buildTicketListKeyboard(page, totalItems, tickets) {
  const totalPages = Math.max(1, Math.ceil(totalItems / TICKETS_PAGE_SIZE));
  const keyboard = tickets.map((ticket) => [
    { text: `🧵 ${sanitizeLine(ticket?.client?.name || ticket.sessionId, 28)}`, callback_data: `open:${ticket.sessionId}` },
    { text: "✍️", callback_data: `reply:${ticket.sessionId}` },
  ]);

  const nav = [];
  if (page > 0) nav.push({ text: "◀️ Назад", callback_data: `list:${page - 1}` });
  if (page < totalPages - 1) nav.push({ text: "Вперёд ▶️", callback_data: `list:${page + 1}` });
  if (nav.length) keyboard.push(nav);

  return { inline_keyboard: keyboard };
}

function buildTicketHistoryText(sessionId, sessionData) {
  const messages = Array.isArray(sessionData?.messages) ? sessionData.messages : [];
  const history = messages.slice(-16);
  const historyText = history.length
    ? history
        .map((msg) => {
          const role = msg.type === "bot" ? "👩‍💻 Поддержка" : "👤 Клиент";
          const when = formatDate(msg.timestamp || Date.now());
          return `${role} [${when}]\n${sanitizeLine(msg.text, 800)}`;
        })
        .join("\n\n")
    : "История пока пустая.";

  return [
    "🧾 <b>Карточка тикета</b>",
    `🆔 <code>${escapeHtml(sessionId)}</code>`,
    `👤 ${escapeHtml(sessionData?.client?.name || "—")}`,
    `📞 ${escapeHtml(sessionData?.client?.contact || "—")}`,
    "",
    historyText,
  ].join("\n");
}

async function telegramApi(botToken, method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result?.ok) {
    throw new Error(result?.description || `Telegram ${method} failed`);
  }
  return result;
}

async function sendTelegramMessage(botToken, chatId, text, extra = {}) {
  return telegramApi(botToken, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...extra,
  });
}

async function answerCallback(botToken, callbackQueryId, text = "Ок") {
  return telegramApi(botToken, "answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

async function editTelegramMessage(botToken, chatId, messageId, text, replyMarkup) {
  return telegramApi(botToken, "editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });
}

async function getSession(env, sessionId) {
  if (!env.CHATS) return { messages: [], createdAt: Date.now(), updatedAt: Date.now(), client: {} };
  const key = `session:${sessionId}`;
  const value = await env.CHATS.get(key, "json");
  if (value && typeof value === "object") return value;
  return { messages: [], createdAt: Date.now(), updatedAt: Date.now(), client: {} };
}

async function saveSession(env, sessionId, sessionData) {
  if (!env.CHATS) return;
  await env.CHATS.put(`session:${sessionId}`, JSON.stringify(sessionData), { expirationTtl: SESSION_TTL_SECONDS });
}

async function addMessage(env, sessionId, message, clientPatch = null) {
  const session = await getSession(env, sessionId);
  if (!Array.isArray(session.messages)) session.messages = [];
  if (!session.createdAt) session.createdAt = Date.now();
  session.updatedAt = Date.now();
  session.messages.push(message);
  if (!session.client || typeof session.client !== "object") session.client = {};
  if (clientPatch && typeof clientPatch === "object") {
    session.client = { ...session.client, ...clientPatch };
  }
  await saveSession(env, sessionId, session);
  return session;
}

async function getMessages(env, sessionId) {
  const session = await getSession(env, sessionId);
  return Array.isArray(session.messages) ? session.messages : [];
}

async function addReply(env, sessionId, replyText) {
  await addMessage(env, sessionId, {
    id: generateId("reply"),
    type: "bot",
    text: String(replyText || "").trim(),
    timestamp: Date.now(),
  });
}

async function getTicketsIndex(env) {
  if (!env.CHATS) return [];
  const data = await env.CHATS.get(TICKETS_INDEX_KEY, "json");
  return Array.isArray(data?.items) ? data.items : [];
}

async function saveTicketsIndex(env, items) {
  if (!env.CHATS) return;
  await env.CHATS.put(TICKETS_INDEX_KEY, JSON.stringify({ items }), { expirationTtl: SESSION_TTL_SECONDS });
}

async function upsertTicket(env, ticket) {
  const items = await getTicketsIndex(env);
  const next = items.filter((item) => item.sessionId !== ticket.sessionId);
  next.unshift(ticket);
  await saveTicketsIndex(env, next.slice(0, 500));
}

async function setPendingReply(env, adminId, sessionId) {
  if (!env.CHATS) return;
  await env.CHATS.put(`admin:pending:${adminId}`, JSON.stringify({ sessionId, createdAt: Date.now() }), {
    expirationTtl: 3600,
  });
}

async function getPendingReply(env, adminId) {
  if (!env.CHATS) return null;
  return env.CHATS.get(`admin:pending:${adminId}`, "json");
}

async function clearPendingReply(env, adminId) {
  if (!env.CHATS) return;
  await env.CHATS.delete(`admin:pending:${adminId}`);
}

function isAuthorizedAdmin(env, userId) {
  const ids = parseAdminIds(env.TELEGRAM_ADMIN_IDS);
  if (!ids.size) return true;
  return ids.has(Number(userId));
}

function generateSessionId() {
  return generateId("sess");
}

function extractSessionId(text) {
  const source = String(text || "");
  const match = source.match(/sess_[a-z0-9_]+/i);
  return match ? match[0] : "";
}

async function showTicketList(botToken, env, chatId, page = 0, edit = null) {
  const all = await getTicketsIndex(env);
  const safePage = Math.max(0, page);
  const start = safePage * TICKETS_PAGE_SIZE;
  const tickets = all.slice(start, start + TICKETS_PAGE_SIZE);
  const text = buildTicketListText(safePage, all.length, tickets);
  const replyMarkup = buildTicketListKeyboard(safePage, all.length, tickets);

  if (edit) {
    return editTelegramMessage(botToken, chatId, edit.messageId, text, replyMarkup);
  }

  return sendTelegramMessage(botToken, chatId, text, { reply_markup: replyMarkup });
}

async function showTicketCard(botToken, env, chatId, sessionId, edit = null) {
  const session = await getSession(env, sessionId);
  const text = buildTicketHistoryText(sessionId, session);
  const replyMarkup = {
    inline_keyboard: [
      [{ text: "✍️ Ответить", callback_data: `reply:${sessionId}` }],
      [{ text: "🔄 Обновить", callback_data: `open:${sessionId}` }, { text: "📋 К списку", callback_data: "list:0" }],
    ],
  };

  if (edit) {
    return editTelegramMessage(botToken, chatId, edit.messageId, text, replyMarkup);
  }

  return sendTelegramMessage(botToken, chatId, text, { reply_markup: replyMarkup });
}

async function processTelegramWebhook(update, env) {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  if (update?.callback_query) {
    const query = update.callback_query;
    const fromId = query?.from?.id;
    const chatId = query?.message?.chat?.id;
    const messageId = query?.message?.message_id;
    const data = String(query?.data || "");

    if (!isAuthorizedAdmin(env, fromId)) {
      await answerCallback(botToken, query.id, "Нет доступа");
      return;
    }

    try {
      if (data.startsWith("open:")) {
        const sessionId = data.slice(5);
        await showTicketCard(botToken, env, chatId, sessionId, { messageId });
        await answerCallback(botToken, query.id, "Открыто");
        return;
      }

      if (data.startsWith("reply:")) {
        const sessionId = data.slice(6);
        await setPendingReply(env, fromId, sessionId);
        await sendTelegramMessage(
          botToken,
          chatId,
          `✍️ Ответ для <code>${escapeHtml(sessionId)}</code>\nОтправьте следующим сообщением текст ответа.`,
          { reply_markup: { force_reply: true, selective: true } },
        );
        await answerCallback(botToken, query.id, "Жду ваш ответ");
        return;
      }

      if (data.startsWith("list:")) {
        const page = Number(data.slice(5) || 0);
        await showTicketList(botToken, env, chatId, Number.isFinite(page) ? page : 0, { messageId });
        await answerCallback(botToken, query.id, "Обновлено");
        return;
      }

      await answerCallback(botToken, query.id, "Неизвестная команда");
    } catch {
      await answerCallback(botToken, query.id, "Ошибка");
    }
    return;
  }

  const message = update?.message;
  if (!message) return;

  const userId = message?.from?.id;
  const chatId = message?.chat?.id;
  const text = String(message?.text || "").trim();
  const replyText = String(message?.reply_to_message?.text || message?.reply_to_message?.caption || "").trim();
  const replySessionId = extractSessionId(replyText);
  if (!isAuthorizedAdmin(env, userId)) return;

  if (text === "/start" || text === "/tickets") {
    await showTicketList(botToken, env, chatId, 0);
    return;
  }

  if (replySessionId && text && !text.startsWith("/")) {
    await addReply(env, replySessionId, text);
    await sendTelegramMessage(
      botToken,
      chatId,
      `✅ Ответ отправлен клиенту\nТикет: <code>${escapeHtml(replySessionId)}</code>`,
      { reply_markup: ticketButtons(replySessionId) },
    );
    return;
  }

  const pending = await getPendingReply(env, userId);
  if (pending?.sessionId && text) {
    const sessionId = pending.sessionId;
    await addReply(env, sessionId, text);
    await clearPendingReply(env, userId);
    await sendTelegramMessage(
      botToken,
      chatId,
      `✅ Ответ отправлен клиенту\nТикет: <code>${escapeHtml(sessionId)}</code>`,
      { reply_markup: ticketButtons(sessionId) },
    );
    return;
  }

  if (text) {
    await sendTelegramMessage(botToken, chatId, "Команды: /tickets");
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: buildCorsHeaders(request, env) });
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/api/telegram/webhook" && request.method === "POST") {
      try {
        const update = await request.json();
        await processTelegramWebhook(update, env);
        return jsonResponse(request, env, 200, { ok: true });
      } catch {
        return jsonResponse(request, env, 200, { ok: true });
      }
    }

    if (pathname.match(/^\/api\/telegram\/messages\/[^/]+$/) && request.method === "GET") {
      const sessionId = pathname.split("/").pop();
      try {
        const messages = await getMessages(env, sessionId);
        return jsonResponse(request, env, 200, { ok: true, messages });
      } catch {
        return jsonResponse(request, env, 500, { ok: false, message: "Ошибка при получении сообщений" });
      }
    }

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

        const userText = payload.Question || payload.Вопрос || payload.question || JSON.stringify(payload);
        const clientInfo = {
          name: payload.Имя || payload.Name || "—",
          contact: payload.Контакт || payload.Contact || "—",
          page: payload.Страница || payload.Page || "—",
        };

        const session = await addMessage(
          env,
          sessionId,
          {
            id: generateId("msg"),
            type: "user",
            text: String(userText || "").trim(),
            timestamp: Date.now(),
            data: payload,
          },
          clientInfo,
        );

        await upsertTicket(env, {
          sessionId,
          updatedAt: session.updatedAt || Date.now(),
          lastUserText: String(userText || "").trim(),
          client: session.client || clientInfo,
        });

        await sendTelegramMessage(
          botToken,
          chatId,
          buildTelegramTicketNotification(sessionId, formType, payload, userText),
          { reply_markup: ticketButtons(sessionId) },
        );

        return jsonResponse(request, env, 200, { ok: true, sessionId });
      } catch (error) {
        return jsonResponse(request, env, 500, {
          ok: false,
          message: "Internal server error",
          details: String(error?.message || "unknown"),
        });
      }
    }

    return jsonResponse(request, env, 404, { ok: false, message: "Not found" });
  },
};
