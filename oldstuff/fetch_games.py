import json
import urllib.request

ZONES_URL = "https://cdn.jsdelivr.net/gh/freebuisness/assets@latest/zones.json"
COVER_URL = "https://cdn.jsdelivr.net/gh/freebuisness/covers@main/"
HTML_URL = "https://cdn.jsdelivr.net/gh/freebuisness/html@main/"
OUTPUT_FILE = "public/games2.json"

with urllib.request.urlopen(ZONES_URL) as response:
    zones = json.loads(response.read().decode())

games = []
for entry in zones:
    if entry.get("id", -1) < 0:
        continue

    url = entry.get("url", "").replace("{HTML_URL}/", HTML_URL).replace("{HTML_URL}", HTML_URL)
    cover = entry.get("cover", "").replace("{COVER_URL}/", COVER_URL).replace("{COVER_URL}", COVER_URL)

    game = {"name": entry["name"], "url": url, "thumbnail": cover}
    games.append(game)

output = {"games": games}

with open(OUTPUT_FILE, "w") as f:
    json.dump(output, f, indent=2)

print(f"Saved {len(games)} games to {OUTPUT_FILE}")
