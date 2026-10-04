import json
import urllib.parse
import urllib.request

JSON_URL = "https://linkdropper.zidanwaiba.com.np/storage/data/collection.json"
PREFIX = "https://linkdropper.zidanwaiba.com.np"
OUTPUT_FILE = "public/petezah.json"


def add_prefix(url):
    if url.startswith("/"):
        return PREFIX + url
    return url


def strip_iframe(url):
    if "iframe.html?url=" in url:
        parsed = urllib.parse.urlparse(url)
        params = urllib.parse.parse_qs(parsed.query)
        if "url" in params:
            return params["url"][0]
    return url


with urllib.request.urlopen(JSON_URL) as response:
    data = json.loads(response.read().decode())

games = []
for entry in data["games"]:
    name = entry.get("label", "")
    raw_url = entry.get("url", "")
    raw_thumbnail = entry.get("imageUrl", "")

    inner_url = strip_iframe(raw_url)
    if "originals" not in inner_url:
        continue

    url = add_prefix(inner_url)
    thumbnail = add_prefix(raw_thumbnail)

    games.append({"name": name, "url": url, "thumbnail": thumbnail})

with open(OUTPUT_FILE, "w") as f:
    json.dump({"games": games}, f, indent=2)

print(f"saved {len(games)} games to {OUTPUT_FILE}")
