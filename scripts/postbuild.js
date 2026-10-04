import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const buildDir = 'build';
// ai gen html to xhtml+svg script
function walk(dir) {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		const s = statSync(path);

		if (s.isDirectory()) {
			walk(path);
		} else if (path.endsWith('.html')) {
			const svgPath = path.replace(/\.html$/, '.svg');
			let html = readFileSync(path, 'utf8');

			html = html.replace(/<!doctype html>/i, '');
			html = html.replace(/<html(?![^>]*\bxmlns=)/i, '<html xmlns="http://www.w3.org/1999/xhtml"');
			html = html.replace(/<(meta|link|br|hr|img|input|source)([^>]*?)(?<!\/)>/gi, '<$1$2 />');

			html = html.replace(
				/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi,
				(_, attrs, body) => {
					const trimmed = body.trim();
					if (!trimmed) return `<script${attrs}></script>`;
					if (/^<!\[CDATA\[/.test(trimmed)) return `<script${attrs}>${body}</script>`;
					return `<script${attrs}>//<![CDATA[\n${body}\n//]]></script>`;
				}
			);

			html = html.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (_, attrs, body) => {
				const trimmed = body.trim();
				if (!trimmed) return `<style${attrs}></style>`;
				if (/^<!\[CDATA\[/.test(trimmed)) return `<style${attrs}>${body}</style>`;
				return `<style${attrs}>/*<![CDATA[*/\n${body}\n/*]]>*/</style>`;
			});

			// XML needs values on all attributes and & escaped; CDATA bodies stay literal
			const cdataBodies = [];
			html = html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, body) => {
				cdataBodies.push(body);
				return `\u0000CDATA${cdataBodies.length - 1}\u0000`;
			});
			// give bare boolean attributes a value (vite inlines module scripts as `<script ... crossorigin>`)
			const BARE_ATTR =
				/(async|defer|crossorigin|disabled|hidden|autofocus|checked|readonly|selected|multiple|novalidate|allowfullscreen|autoplay|controls|loop|muted|playsinline|reversed|inert|ismap)(?=[\s/>])/g;
			html = html.replace(/<[a-zA-Z][^>]*>/g, (tag) => tag.replace(BARE_ATTR, (m) => `${m}=""`));
			html = html.replace(/&(?!(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
			html = html.replace(
				/\u0000CDATA(\d+)\u0000/g,
				(_, i) => `<![CDATA[${cdataBodies[Number(i)]}]]>`
			);

			const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
  <foreignObject width="100%" height="100%">
    ${html.trim()}
  </foreignObject>
</svg>
`;

			writeFileSync(svgPath, svg);
		}
	}
}

walk(buildDir);
console.log('built .svg and kept original .html');
