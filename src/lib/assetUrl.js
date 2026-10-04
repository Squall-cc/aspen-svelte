// the single-file build inlines assets as data: urls, and chrome refuses urls over 2MB,
// so turn big ones into blob: urls (decoded by hand since fetch() has the same limit)
export function assetUrl(url) {
	if (!url.startsWith('data:') || url.length < 1_000_000) return url;
	const [meta, data] = url.split(',', 2);
	const type = meta.slice(5).split(';')[0];
	const bin = meta.endsWith(';base64') ? atob(data) : decodeURIComponent(data);
	const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
	return URL.createObjectURL(new Blob([bytes], { type }));
}
