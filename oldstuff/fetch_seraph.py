import json
import urllib.request

DIRS_URL = "https://raw.githubusercontent.com/Timeis886/seraph/refs/heads/main/storage/js/directories.json"
PREFIX = "https://timeis886.github.io/seraph/"
OUTPUT_FILE = "public/seraph.json"

with urllib.request.urlopen(DIRS_URL) as response:
    dirs = json.loads(response.read().decode())

games = []
for key, data in dirs.items():
    name = key.split("/")[0]
    url = PREFIX + key
    thumbnail = PREFIX + data["thumbnail"].lstrip("/")

    games.append({"name": name, "url": url, "thumbnail": thumbnail})

output = {"games": games}

with open(OUTPUT_FILE, "w") as f:
    json.dump(output, f, indent=2)

print(f"saved {len(games)} games to {OUTPUT_FILE}")
