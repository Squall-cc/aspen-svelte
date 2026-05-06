import { readdirSync, readFileSync, writeFileSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const buildDir = 'build';

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
			html = html.replace(
				/<html(?![^>]*\bxmlns=)/i,
				'<html xmlns="http://www.w3.org/1999/xhtml"'
			);
			html = html.replace(
				/<(meta|link|br|hr|img|input|source)([^>]*?)(?<!\/)>/gi,
				'<$1$2 />'
			);

			const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet">
  <foreignObject width="100%" height="100%">
    ${html.trim()}
  </foreignObject>
</svg>
`;
			writeFileSync(svgPath, svg);
			unlinkSync(path);
		}
	}
}

walk(buildDir);
console.log('built .svg');
