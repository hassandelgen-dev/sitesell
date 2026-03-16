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
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
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

function buildTelegramText(type, payload) {
  const lines = [
    "📩 Новая заявка с сайта",
    `Тип формы: ${type}`,
    `Дата: ${new Date().toLocaleString("uk-UA")}`,
    "",
  ];

  Object.entries(payload).forEach(([key, value]) => {
    lines.push(`${key}: ${value || "—"}`);
  });

  return lines.join("\n");
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: buildCorsHeaders(request, env) });
    }

    const pathname = new URL(request.url).pathname;
    if (pathname !== "/api/telegram") {
      return jsonResponse(request, env, 404, { ok: false, message: "Not found" });
    }

    if (request.method !== "POST") {
      return jsonResponse(request, env, 405, { ok: false, message: "Method not allowed" });
    }

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

      if (!formType || !payload || typeof payload !== "object" || Array.isArray(payload)) {
        return jsonResponse(request, env, 400, { ok: false, message: "Некорректные данные формы" });
      }

      if (isSpamLike(honeypot, loadedAt)) {
        return jsonResponse(request, env, 200, { ok: true });
      }

      const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: buildTelegramText(formType, payload),
        }),
      });

      const telegramResult = await telegramResponse.json();
      if (!telegramResponse.ok || !telegramResult?.ok) {
        return jsonResponse(request, env, 502, {
          ok: false,
          message: "Telegram API вернул ошибку",
          details: telegramResult,
        });
      }

      return jsonResponse(request, env, 200, { ok: true });
    } catch {
      return jsonResponse(request, env, 500, { ok: false, message: "Внутренняя ошибка сервера" });
    }
  },
};
