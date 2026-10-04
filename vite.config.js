import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import UnoCSS from 'unocss/vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { defineConfig } from 'vite';

const path = (p) => fileURLToPath(new URL(p, import.meta.url));
const scramjetDist = path('./node_modules/@mercuryworkshop/scramjet/dist');
const controllerDist = path('./node_modules/@mercuryworkshop/scramjet-controller/dist');

// internal://fail — served for /fail and as the fallback when a proxy request
// reaches the server (sw down, just woke up, etc) instead of the spa fallback
const FAIL_PAGE = `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>failed to load</title>
	</head>
	<body>
		<main>
			<img src="squalllogo.png" alt="Squall Logo">
			<h1>Failure</h1>
			<button onclick="location.reload()">try again</button>
		</main>
	</body>
</html>
`;

// sw.js = scramjet controller's service worker + our fetch handler, as one self-contained file
function serviceWorker() {
	const source = () =>
		readFileSync(`${controllerDist}/controller.sw.js`, 'utf8').replace(
			/\n\/\/# sourceMappingURL=.*$/,
			''
		) +
		`
const PROXY_PREFIX = new URL('./~/sj/', location.href).pathname;
const FAIL_PAGE = ${JSON.stringify(FAIL_PAGE)};
addEventListener('fetch', (e) => {
	const u = new URL(e.request.url);
	if ($scramjetController.shouldRoute(e)) {
		e.respondWith($scramjetController.route(e));
	} else if (u.pathname.startsWith(PROXY_PREFIX)) {
		// sw just woke up (or the controller is gone): answer with the fail page
		// instead of letting the request fall through to the server
		e.respondWith(
			new Response(FAIL_PAGE, { status: 502, headers: { 'content-type': 'text/html; charset=utf-8' } })
		);
	}
});
`;
	return {
		name: 'aspen-sw',
		configureServer(server) {
			const proxyPrefix = new URL('./~/sj/', 'http://localhost/sw.js').pathname;
			server.middlewares.use((req, res, next) => {
				const path = req.url?.split('?')[0];
				if (path === '/sw.js') {
					res.setHeader('Content-Type', 'text/javascript');
					res.end(source());
					return;
				}
				if (path === '/fail') {
					res.setHeader('Content-Type', 'text/html; charset=utf-8');
					res.end(FAIL_PAGE);
					return;
				}
				// dev fallback: a proxy request the sw didn't route would otherwise
				// hit vite's spa fallback and serve index.html (aspen inside aspen)
				if (path?.startsWith(proxyPrefix)) {
					res.statusCode = 502;
					res.setHeader('Content-Type', 'text/html; charset=utf-8');
					res.end(FAIL_PAGE);
					return;
				}
				next();
			});
		},
		generateBundle() {
			this.emitFile({ type: 'asset', fileName: 'sw.js', source: source() });
			this.emitFile({ type: 'asset', fileName: 'fail.html', source: FAIL_PAGE });
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
	plugins: [UnoCSS(), svelte(), serviceWorker(), mode === 'single' && viteSingleFile()],
	build: {
		outDir: 'build',
		emptyOutDir: true
	}
}));
