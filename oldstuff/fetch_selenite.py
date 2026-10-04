import json
import urllib.request

JSON_URL = "https://selenite.cc/resources/games-tagged.json"
PREFIX = "https://selenite.cc/resources/semag/"
OUTPUT_FILE = "public/selenite.json"

with urllib.request.urlopen(JSON_URL) as response:
    data = json.loads(response.read().decode())

games = []
for entry in data:
    directory = entry.get("directory", "")
    image = entry.get("image", "")
    if not directory:
        continue
    games.append({
        "name": entry.get("name", directory),
        "url": f"{PREFIX}{directory}/index.html",
        "thumbnail": f"{PREFIX}{directory}/{image}" if image else "",
    })

with open(OUTPUT_FILE, "w") as f:
    json.dump({"games": games}, f, indent=2)

print(f"saved {len(games)} games to {OUTPUT_FILE}")
