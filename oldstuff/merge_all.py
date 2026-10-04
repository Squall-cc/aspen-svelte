import json
import os
import random

SOURCES = [
    "public/int-v3.json",
    "public/games2.json",
    "public/seraph.json",
    "public/ugs.json",
    "public/3kho-lite.json",
    "public/selenite.json",
    "public/frog.json",
    "public/petezah.json",
    "public/ckv.json",
    "public/vel.json",
    "public/kru.json",
    "public/degloved.json"
]

all_games = []

for path in SOURCES:
    if not os.path.exists(path):
        print(f"skipping {path} (not found)")
        continue
    with open(path) as f:
        data = json.load(f)
    source = os.path.basename(path).replace(".json", "")
    for game in data.get("games", []):
        all_games.append(game)
    print(f"  {source}: {len(data['games'])} games")

random.shuffle(all_games)

with open("public/all.json", "w") as f:
    json.dump({"games": all_games}, f, indent=2)

print(f"saved {len(all_games)} total games to public/all.json")