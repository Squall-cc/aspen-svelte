#100% vibecoded frogies arcade stealer
import json
import re
import urllib.request
from html.parser import HTMLParser

BASE_URL = "https://larp.now"
TARGET_URL = f"{BASE_URL}/math/index.html"
OUTPUT_FILE = "public/frog.json"


class GameParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_target_div = False
        self.div_depth = 0
        self.games = []

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)

        # Detect entry into #mathworksheets div
        if tag == "div":
            if attrs_dict.get("id") == "mathworksheets":
                self.in_target_div = True
                self.div_depth = 1
            elif self.in_target_div:
                self.div_depth += 1

        # Parse <img> tags inside the target div
        if self.in_target_div and tag == "img":
            src = attrs_dict.get("src", "")
            alt = attrs_dict.get("alt", "")
            onclick = attrs_dict.get("onclick", "")

            # Extract the game URL from onclick="window.location.href='/iframe.html?url=...';"
            match = re.search(r"window\.location\.href='[^']*[?&]url=([^']+)'", onclick)
            if match:
                game_path = match.group(1)
            else:
                # Fallback: try direct href patterns without iframe wrapper
                match2 = re.search(r"window\.location\.href='([^']+)'", onclick)
                game_path = match2.group(1) if match2 else None

            if game_path:
                # Build full URLs
                icon_url = BASE_URL + src if src.startswith("/") else src
                game_url = BASE_URL + game_path if game_path.startswith("/") else game_path

                self.games.append({
                    "name": alt,
                    "url": game_url,
                    "thumbnail": icon_url,
                })

    def handle_endtag(self, tag):
        if self.in_target_div and tag == "div":
            self.div_depth -= 1
            if self.div_depth == 0:
                self.in_target_div = False


def main():
    print(f"Fetching {TARGET_URL} ...")

    req = urllib.request.Request(
        TARGET_URL,
        headers={"User-Agent": "Mozilla/5.0 (compatible; GameScraper/1.0)"},
    )
    with urllib.request.urlopen(req, timeout=15) as response:
        html = response.read().decode("utf-8", errors="replace")

    parser = GameParser()
    parser.feed(html)

    games = parser.games
    print(f"Found {len(games)} games.")

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump({"games": games}, f, indent=2, ensure_ascii=False)

    print(f"Saved to {OUTPUT_FILE}")

    # Preview first 3
    for g in games[:3]:
        print(f"  - {g['name']}: {g['url']} ({g['thumbnail']})")


if __name__ == "__main__":
    main()