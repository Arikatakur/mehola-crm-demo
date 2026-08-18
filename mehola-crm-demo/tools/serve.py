# -*- coding: utf-8 -*-
"""Serve the demo locally and open it in the browser.

    python tools/serve.py [port]

Only needed for the multi-file version during development. The bundled file
in dist/ opens by double-click without any server.
"""

import functools
import http.server
import json
import os
import socketserver
import sys
import threading
import urllib.error
import urllib.request
import webbrowser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):        # quiet: one line per request is noise
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        http.server.SimpleHTTPRequestHandler.end_headers(self)

    def do_POST(self):
        if self.path != "/api/ai":
            self.send_error(404)
            return
        api_key = os.environ.get("OPENAI_API_KEY", "").strip()
        if not api_key:
            self._json(503, {"error": "AI_NOT_CONFIGURED", "message": "OPENAI_API_KEY is not configured on the server."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 1_000_000:
                raise ValueError("invalid request size")
            incoming = json.loads(self.rfile.read(length).decode("utf-8"))
            question = str(incoming.get("question", "")).strip()[:4000]
            context = incoming.get("context", {})
            history = incoming.get("history", [])[-8:]
            if not question:
                raise ValueError("question is required")

            instructions = (
                "You are the Mehola CRM AI analyst. Answer in the user's language, usually Hebrew. "
                "Use only the supplied CRM context for company-specific facts and calculations. "
                "Never invent missing figures. Clearly distinguish facts, calculations, and recommendations. "
                "Be concise and practical. When helpful, suggest the relevant screen using its Hebrew name. "
                "You may analyze and recommend, but you cannot change records or claim an action was performed."
            )
            prompt = json.dumps({"question": question, "recent_conversation": history, "crm_context": context}, ensure_ascii=False)
            body = json.dumps({
                "model": os.environ.get("OPENAI_MODEL", "gpt-5.6-luna"),
                "instructions": instructions,
                "input": prompt,
                "store": False
            }).encode("utf-8")
            request = urllib.request.Request(
                "https://api.openai.com/v1/responses", data=body, method="POST",
                headers={"Authorization": "Bearer " + api_key, "Content-Type": "application/json"}
            )
            with urllib.request.urlopen(request, timeout=60) as response:
                result = json.loads(response.read().decode("utf-8"))
            answer = "".join(
                part.get("text", "")
                for item in result.get("output", []) if item.get("type") == "message"
                for part in item.get("content", []) if part.get("type") == "output_text"
            ).strip()
            self._json(200, {"answer": answer or "לא התקבלה תשובה מהמודל.", "response_id": result.get("id")})
        except urllib.error.HTTPError as exc:
            try:
                detail = json.loads(exc.read().decode("utf-8")).get("error", {}).get("message", str(exc))
            except Exception:
                detail = str(exc)
            self._json(exc.code if exc.code < 500 else 502, {"error": "OPENAI_ERROR", "message": detail})
        except Exception as exc:
            self._json(400, {"error": "BAD_REQUEST", "message": str(exc)})

    def _json(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main():
    os.chdir(ROOT)
    handler = functools.partial(Handler, directory=ROOT)
    for port in range(PORT, PORT + 20):
        try:
            httpd = socketserver.TCPServer(("127.0.0.1", port), handler)
            break
        except OSError:
            continue
    else:
        sys.exit("no free port in range %d-%d" % (PORT, PORT + 20))

    url = "http://127.0.0.1:%d/index.html" % port
    print("Mehola CRM demo  ->  %s" % url)
    print("Ctrl+C to stop.")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")


if __name__ == "__main__":
    main()
