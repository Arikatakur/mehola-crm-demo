# -*- coding: utf-8 -*-
"""Serve the demo locally and open it in the browser.

    python tools/serve.py [port]

Only needed for the multi-file version during development. The bundled file
in dist/ opens by double-click without any server.
"""

import functools
import http.server
import os
import socketserver
import sys
import threading
import webbrowser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):        # quiet: one line per request is noise
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        http.server.SimpleHTTPRequestHandler.end_headers(self)


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
