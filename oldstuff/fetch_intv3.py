import json

INPUT_FILE = "randomubg.json"
OUTPUT_FILE = "public/int-v3.json"

with open(INPUT_FILE) as f:
    data = json.load(f)

games = []
for entry in data["games"]:
    name = entry.get("name", "").strip()
    url = entry.get("url", "")
    thumbnail = entry.get("img", "")

    games.append({"name": name, "url": url, "thumbnail": thumbnail})

with open(OUTPUT_FILE, "w") as f:
    json.dump({"games": games}, f, indent=2)

print(f"saved {len(games)} games to {OUTPUT_FILE}")
