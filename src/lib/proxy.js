// scramjet 2 setup: the controller runs in this page, the service worker just forwards requests to it.
// scramjet/controller scripts are bundled as strings and served from blob: urls so the whole app
// can build to index.html + sw.js.
// raw copies live in src/vendor (keep in sync with the deps via `npm run sync:vendor`):
// importing the ?raw files from node_modules makes vite pre-bundle them as real JS,
// which drops the default string export and executes scramjet in the page.
import scramjetSrc from '../vendor/scramjet/scramjet.js?raw';
import controllerApiSrc from '../vendor/scramjet/controller.api.js?raw';
import controllerInjectSrc from '../vendor/scramjet/controller.inject.js?raw';
import wasmUrl from 'scramjet-dist/scramjet.wasm?url';
import EpoxyTransport from '@mercuryworkshop/epoxy-transport';
import { registerSW } from './registerSW.js';
import { assetUrl } from './assetUrl.js';

const DEFAULT_WISP = 'wss://wisp.freewisp.org/';
const OLD_WISPS = ['wss://monaco-edu.online/wisp/'];

export function getWispUrl() {
	const saved = localStorage.getItem('wispUrl');
	if (!saved || OLD_WISPS.includes(saved)) {
		localStorage.setItem('wispUrl', DEFAULT_WISP);
		return DEFAULT_WISP;
	}
	return saved;
}

const blobUrl = (src) => URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));

function loadScript(src) {
	return new Promise((resolve, reject) => {
		const s = document.createElement('script');
		s.src = src;
		s.onload = resolve;
		s.onerror = reject;
		document.head.appendChild(s);
	});
}

async function init() {
	const scramjetPath = blobUrl(scramjetSrc);
	await loadScript(scramjetPath);
	await loadScript(blobUrl(controllerApiSrc));
	// utils reads $scramjet / $scramjetController when it loads, so import it after them
	const { UrlWatcherPlugin } = await import('@mercuryworkshop/scramjet-utils');

	const serviceworker = await registerSW();
	const transport = new EpoxyTransport({ wisp: getWispUrl() });
	await transport.init();

	const controller = new globalThis.$scramjetController.Controller({
		serviceworker,
		transport,
		config: {
			prefix: new URL('./~/sj/', location.href).pathname,
			scramjetPath,
			injectPath: blobUrl(controllerInjectSrc),
			wasmPath: new URL(assetUrl(wasmUrl), location.href).href
		}
	});
	// chrome kills idle service workers and revives them on demand. the lib's built-in
	// revive handler re-registers via a stale ServiceWorker reference, so the revived
	// worker never learns about this controller and stops routing (frames then fall
	// through to the real server). point the lib at the live worker and re-register.
	navigator.serviceWorker.addEventListener('controllerchange', () => {
		controller.serviceWorkerController = navigator.serviceWorker.controller;
		controller.setupMessagePort?.();
	});
	// the lib's swrevive handler (registered above) doesn't always land on a freshly
	// revived worker; retry the re-registration once after a short delay
	navigator.serviceWorker.addEventListener('message', (e) => {
		if (e.data?.$controller$swrevive) {
			setTimeout(() => {
				controller.serviceWorkerController = navigator.serviceWorker.controller;
				controller.setupMessagePort?.();
			}, 500);
		}
	});
	await controller.wait();
	return { controller, UrlWatcherPlugin };
}

let proxy;
export function getProxy() {
	proxy ??= init().catch((e) => {
		proxy = undefined;
		throw e;
	});
	return proxy;
}
