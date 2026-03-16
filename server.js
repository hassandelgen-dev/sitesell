const path = require("path");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 4173;

const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post("/api/telegram", async (req, res) => {
  try {
    if (!botToken || !chatId) {
      return res.status(500).json({
        ok: false,
        message: "Не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID в .env",
      });
    }

    const { type, payload } = req.body || {};

    if (!type || !payload) {
      return res.status(400).json({ ok: false, message: "Некорректные данные формы" });
    }

    const lines = [
      "📩 Новая заявка с сайта",
      `Тип формы: ${type}`,
      `Дата: ${new Date().toLocaleString("uk-UA")}`,
      "",
    ];

    Object.entries(payload).forEach(([key, value]) => {
      lines.push(`${key}: ${value || "—"}`);
    });

    const text = lines.join("\n");

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.ok) {
      return res.status(502).json({
        ok: false,
        message: "Telegram API вернул ошибку",
        details: result,
      });
    }

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Внутренняя ошибка сервера" });
  }
});

app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
