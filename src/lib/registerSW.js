const swAllowedHostnames = ['localhost', '127.0.0.1'];

// registers ./sw.js and resolves with the active worker
export async function registerSW() {
	if (!navigator.serviceWorker) {
		if (location.protocol !== 'https:' && !swAllowedHostnames.includes(location.hostname))
			throw new Error('Service workers cannot be registered without https.');
		throw new Error("Your browser doesn't support service workers.");
	}
	const registration = await navigator.serviceWorker.register('./sw.js');
	if (!navigator.serviceWorker.controller) {
		// wait for clients.claim(), but don't hang forever (e.g. after a hard reload)
		await Promise.race([
			new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true })),
			navigator.serviceWorker.ready.then(() => new Promise((r) => setTimeout(r, 1000)))
		]);
	}
	return navigator.serviceWorker.controller ?? (await navigator.serviceWorker.ready).active ?? registration.active;
}
