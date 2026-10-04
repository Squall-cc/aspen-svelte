// games list from daknux's zones.json (jsdelivr)
const ZONE_URLS = [
	'https://cdn.jsdelivr.net/gh/daknux/assets@latest/zones.json',
	'https://cdn.jsdelivr.net/gh/daknux/assets@master/zones.json',
	'https://cdn.jsdelivr.net/gh/daknux/assets/zones.json'
];
const COVER_URL = 'https://cdn.jsdelivr.net/gh/daknux/covers@main';
const HTML_URL = 'https://cdn.jsdelivr.net/gh/daknux/html@main';

const fill = (s) =>
	String(s ?? '')
		.replace('{COVER_URL}', COVER_URL)
		.replace('{HTML_URL}', HTML_URL);

let zones;
export function getZones() {
	zones ??= (async () => {
		let lastError;
		for (const url of ZONE_URLS) {
			try {
				const res = await fetch(url);
				if (!res.ok) throw new Error(`${res.status} loading ${url}`);
				const json = await res.json();
				const list = Array.isArray(json) ? json : (json.zones ?? []);
				// negative ids are the comments / discord entries, not games
				return (
					list
						.filter((z) => z.id >= 0)
						// zones with a plain http url are links, not html to write into a frame
						.map((z) => ({
							...z,
							external: /^https?:/.test(z.url),
							cover: fill(z.cover),
							url: fill(z.url)
						}))
				);
			} catch (e) {
				lastError = e;
			}
		}
		throw lastError;
	})().catch((e) => {
		zones = undefined;
		throw e;
	});
	return zones;
}

export async function getZoneHtml(zone) {
	const res = await fetch(zone.url);
	if (!res.ok) throw new Error(`${res.status} loading ${zone.name}`);
	return res.text();
}

// write the game straight into a (same-origin, about:blank) iframe
export function writeZone(iframe, html) {
	const doc = iframe.contentDocument;
	doc.open();
	doc.write(html);
	doc.close();
}
