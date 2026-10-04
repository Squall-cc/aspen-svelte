import json
import urllib.request

API_URL = "https://degloved.net/api/games"
PREFIX = "https://degloved.net"
OUTPUT_FILE = "public/degloved.json"

with urllib.request.urlopen(API_URL) as response:
    data = json.loads(response.read().decode())

games = []
for entry in data:
    games.append({
        "name": entry.get("name", ""),
        "url": PREFIX + entry.get("url", ""),
        "thumbnail": PREFIX + entry.get("icon", ""),
    })

with open(OUTPUT_FILE, "w") as f:
    json.dump({"games": games}, f, indent=2)

print(f"saved {len(games)} games to {OUTPUT_FILE}")
