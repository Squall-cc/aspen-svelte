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
			const xml = path.replace(/\.html$/, '.xhtml');
			let html = readFileSync(path, 'utf8');
			html = html.replace(
				/<!doctype html>/i,
				'<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>'
			);
			html = html.replace(/<html(?![^>]*\bxmlns=)/i, '<html xmlns="http://www.w3.org/1999/xhtml"');
			html = html.replace(/<(meta|link|br|hr|img|input|source)([^>]*?)(?<!\/)>/gi, '<$1$2 />');
			writeFileSync(xml, html);
			unlinkSync(path);
		}
	}
}

walk(buildDir);
console.log('built .xhtml');
