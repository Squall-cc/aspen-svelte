// scramjet 2 setup: the controller runs in this page, the service worker just forwards requests to it.
// scramjet/controller scripts are bundled as strings and served from blob: urls so the whole app
// can build to index.html + sw.js.
import scramjetSrc from 'scramjet-dist/scramjet.js?raw';
import controllerApiSrc from 'controller-dist/controller.api.js?raw';
import controllerInjectSrc from 'controller-dist/controller.inject.js?raw';
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
