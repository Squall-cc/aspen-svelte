import json
import re
import urllib.request

JS_URL = "https://raw.githubusercontent.com/WanoCapy/ChickenKingsVault/refs/heads/main/games.js"
BASE_URL = "https://wanocapy.github.io/ChickenKingsVault/"
IMG_BASE = "https://raw.githubusercontent.com/WanoCapy/ChickenKingsVault/refs/heads/main/"
OUTPUT_FILE = "public/ckv.json"

with urllib.request.urlopen(JS_URL) as response:
    js_text = response.read().decode()

links = re.findall(
    r'<a[^>]*href="([^"]*)"[^>]*>\s*<img[^>]*src="([^"]*)"[^>]*>\s*<div>([^<]*)</div>',
    js_text,
    re.DOTALL,
)

games = []
for href, img_src, name in links:
    name = name.strip()
    url = BASE_URL + href
    thumbnail = IMG_BASE + img_src.lstrip("/")

    games.append({"name": name, "url": url, "thumbnail": thumbnail})

with open(OUTPUT_FILE, "w") as f:
    json.dump({"games": games}, f, indent=2)

print(f"saved {len(games)} games to {OUTPUT_FILE}")
