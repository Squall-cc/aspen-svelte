import json
import urllib.request

JSON_URL = "https://velara.cc/data/games.json"
BASE_URL = "https://velara.cc/"
OUTPUT_FILE = "public/vel.json"

with urllib.request.urlopen(JSON_URL) as response:
    data = json.loads(response.read().decode())

games = []
for entry in data:
    name = entry.get("title", "").strip()
    location = entry.get("location", "")
    image = entry.get("image", "")

    url = BASE_URL + location.lstrip("/")
    thumbnail = BASE_URL + image.lstrip("/") if image else ""

    games.append({"name": name, "url": url, "thumbnail": thumbnail})

with open(OUTPUT_FILE, "w") as f:
    json.dump({"games": games}, f, indent=2)

print(f"saved {len(games)} games to {OUTPUT_FILE}")
