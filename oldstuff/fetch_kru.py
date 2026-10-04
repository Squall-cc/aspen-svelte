import json
import urllib.request

JSON_URL = "https://raw.githubusercontent.com/irv77/KruatedPhear/refs/heads/main/assets/json/links_all.json"
IMG_BASE = "https://raw.githubusercontent.com/irv77/KruatedPhear/refs/heads/main"
OUTPUT_FILE = "public/kru.json"

with urllib.request.urlopen(JSON_URL) as response:
    data = json.loads(response.read().decode())

all_games = []
for section in data["links"]:
    all_games.extend(section.get("games", []))

games = []
for entry in all_games:
    # [name, image_path, url, category]
    name = entry[0]
    img_path = entry[1]
    url = entry[2]

    thumbnail = IMG_BASE + ("" if img_path.startswith("/") else "/") + img_path

    games.append({"name": name, "url": url, "thumbnail": thumbnail})

with open(OUTPUT_FILE, "w") as f:
    json.dump({"games": games}, f, indent=2)

print(f"saved {len(games)} games to {OUTPUT_FILE}")
