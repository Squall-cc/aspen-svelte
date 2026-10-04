import requests
import json

REPO = "bubbls/ugs-singlefile"
BRANCH = "main"
API_URL = f"https://api.github.com/repos/{REPO}/contents/UGS-Files"
CDN_BASE = "https://cdn.jsdelivr.net/gh/{REPO}@{BRANCH}/UGS-Files"

response = requests.get(API_URL)
files = response.json()

games = []
for f in files:
    if f["name"].endswith(".html"):
        name = f["name"].replace(".html", "")
        url = f"https://cdn.jsdelivr.net/gh/{REPO}@{BRANCH}/UGS-Files/{f['name']}"
        games.append({
            "name": name.removeprefix("cl"),
            "url": url,
            "thumbnail": "ugs.png"
        })

output = {"games": games}
with open("public/ugs.json", "w") as out:
    open("public/ugs.json", "w").write(json.dumps(output, indent=2))