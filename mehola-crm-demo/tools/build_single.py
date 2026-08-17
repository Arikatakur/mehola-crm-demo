# -*- coding: utf-8 -*-
"""
Bundle the demo into ONE self-contained .html file.

The result has no external references at all — CSS, scripts, data and logo are
inlined — so it opens by double-click on any machine, with no server, no
install and no network. That is the copy you send to the client.

Usage:  python tools/build_single.py
Output: dist/mehola-crm-demo.html
"""

import base64
import datetime
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "dist", "mehola-crm-demo.html")


def read(*parts):
    with io.open(os.path.join(ROOT, *parts), encoding="utf-8") as f:
        return f.read()


def data_uri(path):
    ext = os.path.splitext(path)[1].lstrip(".").lower()
    mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
            "svg": "image/svg+xml"}.get(ext, "application/octet-stream")
    with open(os.path.join(ROOT, path), "rb") as f:
        return "data:%s;base64,%s" % (mime, base64.b64encode(f.read()).decode("ascii"))


def main():
    html = read("index.html")
    logo = data_uri("assets/logo.jpg")

    # 1. inline the stylesheet
    css = read("src", "styles.css")
    html = html.replace(
        '<link rel="stylesheet" href="src/styles.css">',
        "<style>\n" + css + "\n</style>")

    # 2. inline every script, in the order index.html declares them
    def inline_script(m):
        src = m.group(1)
        code = read(*src.split("/"))
        return "<script>\n/* ---- %s ---- */\n%s\n</script>" % (src, code)

    html, n = re.subn(r'<script src="([^"]+)"></script>', inline_script, html)

    # 3. inline images
    html = html.replace('href="assets/logo.jpg"', 'href="%s"' % logo)
    html = html.replace('src="assets/logo.jpg"', 'src="%s"' % logo)

    html = html.replace("</head>",
        "<!-- built %s by tools/build_single.py — edit the sources, not this file -->\n</head>"
        % datetime.datetime.now().strftime("%Y-%m-%d %H:%M"))

    if 'src="src/' in html or 'href="src/' in html or 'assets/' in html:
        sys.exit("build failed: unresolved external reference left in the output")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with io.open(OUT, "w", encoding="utf-8") as f:
        f.write(html)

    sys.stdout.reconfigure(encoding="utf-8")
    print("wrote %s" % os.path.relpath(OUT, ROOT))
    print("  scripts inlined: %d" % n)
    print("  size: %.1f KB" % (os.path.getsize(OUT) / 1024.0))
    print("  open it by double-clicking — no server needed")


if __name__ == "__main__":
    main()
