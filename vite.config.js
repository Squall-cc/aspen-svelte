import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import UnoCSS from 'unocss/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import civetVitePlugin from '@danielx/civet/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { defineConfig } from 'vite';

const path = (p) => fileURLToPath(new URL(p, import.meta.url));
const scramjetDist = path('./node_modules/@mercuryworkshop/scramjet/dist');
const controllerDist = path('./node_modules/@mercuryworkshop/scramjet-controller/dist');

// sw.js = scramjet controller's service worker + our fetch handler, as one self-contained file
function serviceWorker() {
	const source = () =>
		readFileSync(`${controllerDist}/controller.sw.js`, 'utf8').replace(/\n\/\/# sourceMappingURL=.*$/, '') +
		`
addEventListener('fetch', (e) => {
	if ($scramjetController.shouldRoute(e)) e.respondWith($scramjetController.route(e));
});
`;
	return {
		name: 'aspen-sw',
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				if (req.url?.split('?')[0] !== '/sw.js') return next();
				res.setHeader('Content-Type', 'text/javascript');
				res.end(source());
			});
		},
		generateBundle() {
			this.emitFile({ type: 'asset', fileName: 'sw.js', source: source() });
		}
	};
}

// `vite build` -> multi-file build, `vite build --mode single` -> index.html + sw.js
export default defineConfig(({ mode }) => ({
	base: './',
	// robots.txt etc. only in the multi-file build
	publicDir: mode === 'single' ? false : 'public',
	resolve: {
		alias: {
			$lib: path('./src/lib'),
			'scramjet-dist': scramjetDist,
			'controller-dist': controllerDist
		}
	},
	plugins: [
		UnoCSS(),
		civetVitePlugin({ outputExtension: '.svelte.js', ts: 'esbuild' }),
		svelte(),
		serviceWorker(),
		mode === 'single' && viteSingleFile()
	],
	build: {
		outDir: 'build',
		emptyOutDir: true
	}
}));
