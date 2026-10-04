import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
	['node_modules/@mercuryworkshop/scramjet/dist/scramjet.js', 'src/vendor/scramjet/scramjet.js'],
	[
		'node_modules/@mercuryworkshop/scramjet-controller/dist/controller.api.js',
		'src/vendor/scramjet/controller.api.js'
	],
	[
		'node_modules/@mercuryworkshop/scramjet-controller/dist/controller.inject.js',
		'src/vendor/scramjet/controller.inject.js'
	]
];

for (const [from, to] of files) {
	mkdirSync(join(root, dirname(to)), { recursive: true });
	copyFileSync(join(root, from), join(root, to));
	console.log(`synced ${from} -> ${to}`);
}
