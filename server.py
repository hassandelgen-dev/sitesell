import json
import os
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib import error
from urllib import request


def load_env_file(env_path: str = ".env") -> None:
    if not os.path.exists(env_path):
        return

    with open(env_path, "r", encoding="utf-8") as file:
        for raw_line in file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip()
            if key and key not in os.environ:
                os.environ[key] = value


class SiteHandler(SimpleHTTPRequestHandler):
    def _send_json(self, status_code: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/api/telegram":
            self._send_json(404, {"ok": False, "message": "Not found"})
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw_body = self.rfile.read(content_length)
            body = json.loads(raw_body.decode("utf-8"))

            form_type = body.get("type")
            payload = body.get("payload")
            honeypot = body.get("_hp", "")
            loaded_at = body.get("_loadedAt")

            if not form_type or not isinstance(payload, dict):
                self._send_json(400, {"ok": False, "message": "Некорректные данные формы"})
                return

            # Антиспам: honeypot заполнен — тихо отбрасываем
            if str(honeypot).strip():
                self._send_json(200, {"ok": True})
                return

            # Антиспам: форма отправлена слишком быстро
            if loaded_at is not None:
                try:
                    elapsed_ms = (datetime.now().timestamp() * 1000) - float(loaded_at)
                    if elapsed_ms < 2500:
                        self._send_json(200, {"ok": True})
                        return
                except (ValueError, TypeError):
                    pass

            token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
            chat_id = os.environ.get("TELEGRAM_CHAT_ID", "")

            if not token or not chat_id:
                self._send_json(
                    500,
                    {
                        "ok": False,
                        "message": "Не заданы TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID в .env",
                    },
                )
                return

            lines = [
                "📩 Новая заявка с сайта",
                f"Тип формы: {form_type}",
                f"Дата: {datetime.now().strftime('%d.%m.%Y %H:%M:%S')}",
                "",
            ]

            for key, value in payload.items():
                lines.append(f"{key}: {value if value else '—'}")

            text = "\n".join(lines)
            telegram_url = f"https://api.telegram.org/bot{token}/sendMessage"

            telegram_payload = json.dumps({"chat_id": chat_id, "text": text}).encode("utf-8")
            telegram_request = request.Request(
                telegram_url,
                data=telegram_payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )

            with request.urlopen(telegram_request, timeout=15) as response:
                response_body = response.read().decode("utf-8")
                telegram_result = json.loads(response_body)

            if not telegram_result.get("ok"):
                self._send_json(
                    502,
                    {
                        "ok": False,
                        "message": "Telegram API вернул ошибку",
                        "details": telegram_result,
                    },
                )
                return

            self._send_json(200, {"ok": True})
        except error.HTTPError as http_error:
            try:
                error_body = http_error.read().decode("utf-8")
                telegram_error = json.loads(error_body)
                self._send_json(
                    502,
                    {
                        "ok": False,
                        "message": "Telegram API вернул ошибку",
                        "details": telegram_error,
                    },
                )
            except Exception:
                self._send_json(502, {"ok": False, "message": "Telegram API вернул ошибку"})
        except Exception:
            self._send_json(500, {"ok": False, "message": "Внутренняя ошибка сервера"})


if __name__ == "__main__":
    load_env_file()
    port = int(os.environ.get("PORT", "4173"))

    server = HTTPServer(("", port), SiteHandler)
    print(f"Server started on http://localhost:{port}")
    server.serve_forever()
