import json
import urllib.request

JSON_URL = "https://1kh0.github.io/config/games.json"
PREFIX = "https://1kh0.github.io/"
OUTPUT_FILE = "public/3kho-lite.json"


def absolutize(path):
    if not path:
        return ""
    if path.startswith(("http://", "https://", "//")):
        return path
    return PREFIX + path.lstrip("/")


with urllib.request.urlopen(JSON_URL) as response:
    data = json.loads(response.read().decode())

games = []
for entry in data:
    games.append({
        "name": entry.get("title", ""),
        "url": absolutize(entry.get("link", "")),
        "thumbnail": absolutize(entry.get("imgSrc", "")),
    })

with open(OUTPUT_FILE, "w") as f:
    json.dump({"games": games}, f, indent=2)

print(f"saved {len(games)} games to {OUTPUT_FILE}")
