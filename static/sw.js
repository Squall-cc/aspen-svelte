importScripts('./static/all.js');

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(
	(async () => {
		await self.clients.claim();
		try {
			await new Promise((resolve, reject) => {
				const req = indexedDB.deleteDatabase('$scramjet');
				req.onsuccess = resolve;
				req.onerror = reject;
			});
		} catch {}
	})()
));

self.addEventListener('fetch', (event) => {
	event.respondWith(
		(async () => {
			await scramjet.loadConfig();
			if (scramjet.route(event)) {
				return scramjet.fetch(event);
			}
			return fetch(event.request);
		})()
	);
});
