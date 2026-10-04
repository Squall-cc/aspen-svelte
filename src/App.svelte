<script>
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';
	import { search } from '$lib/search.js';
	import { getProxy } from '$lib/proxy.js';
	import { getZoneHtml, writeZone } from '$lib/zones.js';
	import Omnibox from '$lib/Omnibox.svelte';
	import NewTab from '$lib/NewTab.svelte';
	import Games from '$lib/Games.svelte';
	import VantaBg from '$lib/VantaBg.svelte';
	import loadingGif from '$lib/assets/loading.gif';

	let tabs = $state([]);
	let openTab = $state(null);
	let frameContainer;

	// one message listener per page (survives hmr), latest component wins
	const openUrlHandlerKey = Symbol.for('aspen-open-url-listener');
	function installOpenUrlHandler(fn) {
		const w = window;
		if (!w[openUrlHandlerKey]) {
			w[openUrlHandlerKey] = true;
			w.addEventListener('message', (e) => {
				if (e.origin !== location.origin || !e.data?.$aspenOpen) return;
				const url = e.data.$aspenOpen.url;
				if (typeof url !== 'string' || !/^https?:/.test(url)) return;
				w.__aspenOpenUrlHandler?.(url);
			});
		}
		w.__aspenOpenUrlHandler = fn;
	}

	// one iframe per tab, kept alive while the tab is open
	const views = new Map();
	// scramjet frames for browser tabs
	const frames = new Map();
	// plain iframes for same-origin pages (scramjet can't proxy same origin)
	const directs = new Map();
	// per-tab history: Map<tabId, { stack: string[], idx: number }>
	const tabHistories = new Map();
	// per-tab timeouts that stop the spinner if a frame never fires load
	const loadWatchdogs = new Map();

	const PROXY_INIT_TIMEOUT = 30_000;
	const LOAD_TIMEOUT = 60_000;

	let currentUrl = $state('');
	let canGoBack = $state(false);
	let canGoForward = $state(false);

	const searchEngine = 'https://duckduckgo.com/?q=%s';
	// regex from stack overflow
	const linkRegex =
		/^(([a-z]+:\/\/)?(([a-z0-9\-]+\.)+([a-z]{2}|aero|arpa|biz|com|coop|edu|gov|info|int|jobs|mil|museum|name|nato|net|org|pro|travel|local|internal))(:[0-9]{1,5})?(\/[a-z0-9_\-\.~]+)*(\/([a-z0-9_\-\.]*)(\?[a-z0-9+_\-\.%=&]*)?)?(#[a-zA-Z0-9!$&'()*+.=\-_~:@\/?]*)?)$/i;
	const searxUrl = 'https://www.metacrawler.com/serp?q=';

	const splashes = [
		'the trees are talking',
		'now with animations for extra dopamine',
		'trust',
		'never hop off, never WHAT?',
		'bloxmath is the opp',
		'works on my machine, lil bro',
		'made by middle schoolers for addicted high schoolers',
		'no thoughts, just colors',
		'join discord',
		'blake is a larp',
		'ctrl+shift+q twice for free robux',
		'faster than your blocker',
		'clankers in paris',
		'will should wear his nike tech',
		'share links',
		'dont gatekeep',
		'gn-math is ai slop, anyone can port',
		'all my homies love karl marx',
		'we ball, gangalang',
		'made by linux powerusers'
	];

	function splashFor(tab) {
		return splashes[tab.splash];
	}

	function rotateSplash(tab) {
		tab.splash = Math.floor(Math.random() * splashes.length);
	}

	function setDraft(tab, value) {
		tab.searchDraft = value;
	}

	const makeTab = (partial) => ({
		searchDraft: '',
		splash: Math.floor(Math.random() * splashes.length),
		loading: false,
		error: '',
		...partial
	});

	const activeTab = $derived(tabs.find((t) => t.id === openTab));
	const canReload = $derived(!!activeTab?.content && activeTab.type !== 'games');

	// same-domain urls are shown as internal://, like the old site's internal pages
	function getDisplayUrl(url) {
		if (!url) return '';
		try {
			const u = new URL(url);
			if (u.origin === location.origin)
				return `internal://${u.pathname.replace(/^\//, '')}${u.search}${u.hash}`;
			return url;
		} catch {
			return url;
		}
	}

	function isSameOrigin(url) {
		try {
			return new URL(url).origin === location.origin;
		} catch {
			return false;
		}
	}

	// internal://x -> <current domain>/x, internal://games -> the games tab, otherwise the old logic
	function resolveInput(raw) {
		const trimmed = raw.trim();
		if (trimmed.startsWith('internal://')) {
			const path = trimmed.slice('internal://'.length).replace(/^\/+/, '');
			if (path === 'games' || path === 'games/') {
				openGamesTab();
				return null;
			}
			return new URL(`/${path}`, location.origin).toString();
		}
		if (linkRegex.test(trimmed)) return trimmed;
		return `${searxUrl}${encodeURIComponent(trimmed)}`;
	}

	const reveal = (node, { duration = 200 } = {}) => ({
		duration,
		easing: cubicOut,
		css: (t) => `clip-path: inset(0 ${100 * (1 - t)}% 0 0)`
	});
	const drop = (node, { duration = 200 } = {}) => ({
		duration,
		easing: (t) => t * t,
		css: (t, u) => `opacity: ${u}; transform: translateY(${40 * t}px)`
	});
	const fadeUp = (node, { duration = 300, delay = 0, y = 10 } = {}) => ({
		duration,
		delay,
		easing: cubicOut,
		css: (t) => `opacity: ${t}; transform: translateY(${y * (1 - t)}px)`
	});

	function showFrame(tabId) {
		for (const [id, view] of views) view.style.display = id === tabId ? '' : 'none';
	}

	function syncNav(tabId) {
		if (tabId !== openTab) return;
		const tab = tabs.find((t) => t.id === tabId);
		// the games list isn't a proxied page, so it has no history
		if (tab?.type === 'games') {
			currentUrl = 'internal://games';
			canGoBack = false;
			canGoForward = false;
			return;
		}
		const h = tabHistories.get(tabId);
		currentUrl = getDisplayUrl(h?.stack[h.idx] ?? '');
		canGoBack = !!h && h.idx > 0;
		canGoForward = !!h && h.idx < h.stack.length - 1;
	}

	// update history on in-page navigation
	function onUrlChange(tabId, url) {
		const h = tabHistories.get(tabId);
		if (!h) return;
		if (url !== h.stack[h.idx]) {
			h.stack = h.stack.slice(0, h.idx + 1);
			h.stack.push(url);
			h.idx = h.stack.length - 1;
		}
		const tab = tabs.find((t) => t.id === tabId);
		if (tab) tab.label = labelFor(url);
		syncNav(tabId);
	}

	async function loadProxy(rawUrl) {
		const tabId = openTab;
		if (tabId === null) return;
		const tab = tabs.find((t) => t.id === tabId);
		if (!tab) return;
		const url = search(rawUrl, searchEngine);

		// push to this tabs history
		const h = tabHistories.get(tabId) ?? { stack: [], idx: -1 };
		h.stack = h.stack.slice(0, h.idx + 1);
		h.stack.push(url);
		h.idx = h.stack.length - 1;
		tabHistories.set(tabId, h);
		syncNav(tabId);
		await loadUrl(tabId, url);
	}

	async function loadUrl(tabId, url) {
		const tab = tabs.find((t) => t.id === tabId);
		if (!tab) return;

		// same-origin pages (internal://) load straight into the iframe, no proxy
		if (isSameOrigin(url)) {
			if (views.has(tabId)) await destroyView(tabId);
			if (!tabs.some((t) => t.id === tabId)) return;
			loadDirect(tabId, url);
			return;
		}

		tab.loading = true;
		tab.error = '';
		try {
			const { controller, UrlWatcherPlugin } = await Promise.race([
				getProxy(),
				new Promise((_, rej) =>
					setTimeout(() => rej(new Error('proxy init timed out')), PROXY_INIT_TIMEOUT)
				)
			]);
			if (!tabs.some((t) => t.id === tabId)) return;

			// tab was a game before
			if (views.has(tabId) && !frames.has(tabId)) await destroyView(tabId);

			let frame = frames.get(tabId);
			if (!frame) {
				const iframe = makeIframe(tabId, tab);
				frame = controller.createFrame(iframe, {
					plugins: [new UrlWatcherPlugin((u) => onUrlChange(tabId, u))]
				});
				frames.set(tabId, frame);
			}
			showFrame(openTab);
			frame.go(url);
			// if the frame's load event never fires (wisp blackholed etc) stop the spinner anyway
			clearTimeout(loadWatchdogs.get(tabId));
			loadWatchdogs.set(
				tabId,
				setTimeout(() => {
					loadWatchdogs.delete(tabId);
					if (tabs.some((t) => t.id === tabId)) tab.loading = false;
				}, LOAD_TIMEOUT)
			);
		} catch (e) {
			console.error(e);
			if (!tabs.some((t) => t.id === tabId)) return;
			tab.loading = false;
			tab.error = e?.message || String(e);
		}
	}

	function makeIframe(tabId, tab) {
		const iframe = document.createElement('iframe');
		iframe.className = 'frame';
		iframe.allow = 'fullscreen; autoplay; gamepad';
		iframe.addEventListener('load', () => {
			clearTimeout(loadWatchdogs.get(tabId));
			loadWatchdogs.delete(tabId);
			if (tabs.some((t) => t.id === tabId)) tab.loading = false;
			hookFrame(iframe);
		});
		frameContainer.appendChild(iframe);
		views.set(tabId, iframe);
		// hook the initial about:blank window too (it survives doc.write in game zones)
		hookFrame(iframe);
		return iframe;
	}

	// window features that mark a window.open call as a popup; anything without them
	// is a "new window" and gets turned into an aspen tab
	const POPUP_FEATURES =
		/\b(width|height|innerWidth|innerHeight|outerWidth|outerHeight|left|top|screenX|screenY|menubar|toolbar|location|personalbar|resizable|scrollbars|status|dependent|fullscreen|movable|proxying)\s*=/;

	// scramjet rewrites page urls to /~/sj/<ctrl>/<frame>/<encoded-url>; recover the original
	function deproxyUrl(raw) {
		try {
			const u = new URL(raw, location.origin);
			if (u.origin !== location.origin) return null;
			const m = u.pathname.match(/^\/~\/sj\/[^/]+\/[^/]+\/(.+)$/);
			return m ? decodeURIComponent(m[1]) : null;
		} catch {
			return null;
		}
	}

	function forwardToNewTab(url) {
		window.postMessage({ $aspenOpen: { url } }, location.origin);
	}

	// runs on every frame document; turns "new window" navigations into aspen tabs
	// while sized popups keep opening as real browser windows
	function hookFrame(iframe) {
		let win;
		try {
			win = iframe.contentWindow;
		} catch {
			return;
		}
		if (win && !win.__aspenOpenHooked) {
			win.__aspenOpenHooked = true;
			const origOpen = win.open;
			win.open = function (url, target, features) {
				let isPopup = false;
				if (typeof features === 'string') isPopup = POPUP_FEATURES.test(features);
				else if (features && typeof features === 'object')
					isPopup = Object.keys(features).length > 0;
				const tgt = typeof target === 'string' ? target.toLowerCase() : '';
				const isNewWindow = tgt === '' || tgt === '_blank' || tgt === '_new' || tgt === 'new';
				let abs = '';
				if (url != null && String(url).trim() !== '') {
					try {
						abs = new URL(String(url), win.location.href).href;
					} catch {}
				}
				if (!isPopup && isNewWindow && /^https?:/.test(abs)) {
					forwardToNewTab(deproxyUrl(abs) ?? abs);
					return null;
				}
				return origOpen.call(win, url, target, features);
			};
		}
		let doc;
		try {
			doc = iframe.contentDocument;
		} catch {
			doc = null;
		}
		if (doc && !doc.__aspenAnchorHooked) {
			doc.__aspenAnchorHooked = true;
			doc.addEventListener(
				'click',
				(e) => {
					const a = e.target?.closest?.('a[href][target]');
					if (!a) return;
					const target = (a.getAttribute('target') || '').toLowerCase();
					if (target !== '_blank' && target !== '_new' && target !== 'new') return;
					if (a.hasAttribute('download')) return;
					let abs;
					try {
						abs = new URL(a.getAttribute('href'), doc.baseURI || doc.location.href).href;
					} catch {
						return;
					}
					if (!/^https?:/.test(abs)) return;
					e.preventDefault();
					forwardToNewTab(deproxyUrl(abs) ?? abs);
				},
				true
			);
		}
	}

	// same-origin pages don't go through scramjet, just point a plain iframe at them
	function loadDirect(tabId, url) {
		const tab = tabs.find((t) => t.id === tabId);
		if (!tab) return;
		tab.loading = true;
		tab.error = '';
		let iframe = directs.get(tabId);
		if (!iframe) {
			iframe = makeIframe(tabId, tab);
			directs.set(tabId, iframe);
		}
		iframe.src = url;
		showFrame(openTab);
	}

	async function destroyView(tabId) {
		views.get(tabId)?.remove();
		views.delete(tabId);
		directs.delete(tabId);
		const frame = frames.get(tabId);
		if (!frame) return;
		frames.delete(tabId);
		try {
			const { controller } = await getProxy();
			controller.frames = controller.frames.filter((f) => f !== frame);
		} catch {
			// controller is unreachable anyway, nothing to deregister
		}
	}

	function goBack() {
		if (openTab === null) return;
		const h = tabHistories.get(openTab);
		if (!h || h.idx <= 0) return;
		h.idx--;
		syncNav(openTab);
		navHistory(openTab, 'back');
	}

	function goForward() {
		if (openTab === null) return;
		const h = tabHistories.get(openTab);
		if (!h || h.idx >= h.stack.length - 1) return;
		h.idx++;
		syncNav(openTab);
		navHistory(openTab, 'forward');
	}

	function reload() {
		const tab = tabs.find((t) => t.id === openTab);
		if (!tab || !tab.content || tab.type === 'games') return;
		if (tab.type === 'game') return loadGame(tab.id, tab.zone);
		tab.loading = true;
		clearTimeout(loadWatchdogs.get(tab.id));
		loadWatchdogs.set(
			tab.id,
			setTimeout(() => {
				loadWatchdogs.delete(tab.id);
				if (tabs.some((t) => t.id === tab.id)) tab.loading = false;
			}, LOAD_TIMEOUT)
		);
		const frame = frames.get(tab.id);
		if (frame) return frame.reload();
		directs.get(tab.id)?.contentWindow?.location.reload();
	}

	// same-origin history entries are plain iframes, everything else is a scramjet frame;
	// switching page kinds means reloading the entry through the normal path
	function navHistory(tabId, dir) {
		const h = tabHistories.get(tabId);
		const url = h?.stack[h.idx];
		if (!url) return;
		const direct = directs.get(tabId);
		const same = isSameOrigin(url);
		if (same && direct) {
			direct.src = url;
			return;
		}
		if (same !== !!direct) return loadUrl(tabId, url);
		if (dir === 'back') frames.get(tabId)?.back();
		else frames.get(tabId)?.forward();
	}

	function nextId() {
		return (tabs.length ? Math.max(...tabs.map((t) => t.id)) : 0) + 1;
	}

	// internal:// pages open in the current tab, so this converts it instead of adding one
	async function openGamesTab() {
		const tab = tabs.find((t) => t.id === openTab);
		if (tab) {
			if (tab.type === 'games') return;
			if (views.has(tab.id) || frames.has(tab.id)) await destroyView(tab.id);
			if (!tabs.some((t) => t.id === tab.id)) return;
			tab.type = 'games';
			tab.label = 'games';
			tab.content = null;
			tab.zone = undefined;
			tab.loading = false;
			tab.error = '';
			tabHistories.delete(tab.id);
			syncNav(tab.id);
		} else {
			const id = nextId();
			tabs.push(makeTab({ id, label: 'games', content: null, type: 'games' }));
			selectTab(id);
		}
	}

	// games get written straight into a fresh iframe, no proxy
	async function loadGame(tabId, zone) {
		const tab = tabs.find((t) => t.id === tabId);
		if (!tab) return;
		tab.loading = true;
		tab.error = '';
		try {
			await destroyView(tabId);
			if (!tabs.some((t) => t.id === tabId)) return;
			const html = await getZoneHtml(zone);
			if (!tabs.some((t) => t.id === tabId)) return;
			const iframe = makeIframe(tabId, tab);
			writeZone(iframe, html);
			hookFrame(iframe);
			showFrame(openTab);
		} catch (e) {
			console.error(e);
			if (!tabs.some((t) => t.id === tabId)) return;
			tab.error = e?.message || String(e);
		} finally {
			if (tabs.some((t) => t.id === tabId)) tab.loading = false;
		}
	}

	function openGame(zone) {
		// some zones are just links
		if (zone.external) {
			const id = nextId();
			tabs.push(makeTab({ id, label: labelFor(zone.url), content: zone.url, type: 'browser' }));
			selectTab(id);
			loadProxy(zone.url);
			return;
		}
		const id = nextId();
		tabs.push(
			makeTab({ id, label: zone.name.slice(0, 20), content: zone.name, type: 'game', zone })
		);
		selectTab(id);
		loadGame(id, zone);
	}

	// omnibox input
	function navigateOmnibox(raw) {
		const target = resolveInput(raw);
		if (target === null) return; // internal://games handled by openGamesTab
		const tab = tabs.find((t) => t.id === openTab);
		if (tab) {
			tab.content = target;
			tab.label = labelFor(target);
			tab.type = 'browser';
		}
		if (frameContainer) loadProxy(target);
	}

	// newtab overlay search
	function submitSearch(query) {
		const target = resolveInput(query);
		if (target === null) return;
		if (openTab === null) {
			const id = nextId();
			tabs.push(makeTab({ id, label: labelFor(target), content: target, type: 'browser' }));
			openTab = id;
		} else {
			const tab = tabs.find((t) => t.id === openTab);
			if (tab) {
				tab.content = target;
				tab.label = labelFor(target);
				tab.type = 'browser';
			}
		}
		if (frameContainer) loadProxy(target);
	}

	function selectTab(id) {
		if (openTab === id) return;
		openTab = id;
		showFrame(openTab);
		syncNav(openTab);
	}

	function labelFor(raw) {
		try {
			const u = new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`);
			// same-origin pages are labeled by path, like internal://<path>
			if (u.origin === location.origin) {
				const path = u.pathname.replace(/^\/+|\/+$/g, '');
				return path ? path.slice(0, 20) : 'aspen';
			}
			return u.hostname.replace(/^www\./, '').slice(0, 20) || 'new tab';
		} catch {
			return raw.slice(0, 20) || 'new tab';
		}
	}

	function newTab() {
		const id = nextId();
		tabs.push(makeTab({ id, label: 'new tab', content: null, type: 'browser' }));
		selectTab(id);
	}

	// "new window" requests from frames (window.open / target=_blank) open as aspen tabs
	function openUrlInNewTab(url) {
		const id = nextId();
		tabs.push(makeTab({ id, label: labelFor(url), content: url, type: 'browser' }));
		selectTab(id);
		loadProxy(url);
	}

	function closeTab(id) {
		clearTimeout(loadWatchdogs.get(id));
		loadWatchdogs.delete(id);
		tabHistories.delete(id);
		destroyView(id).catch(() => {});
		const idx = tabs.findIndex((t) => t.id === id);
		tabs = tabs.filter((t) => t.id !== id);
		if (openTab === id) {
			// open the nearest surviving tab, or drop to no-tabs if none left
			const neighbor = tabs[idx - 1] ?? tabs[idx] ?? null;
			openTab = neighbor ? neighbor.id : null;
			showFrame(openTab);
			if (openTab === null) {
				currentUrl = '';
				canGoBack = false;
				canGoForward = false;
			} else {
				syncNav(openTab);
			}
		}
	}

	// the old ui always starts with a fresh tab
	onMount(() => {
		if (tabs.length === 0) newTab();
		installOpenUrlHandler(openUrlInNewTab);
	});
</script>

<VantaBg />

<div id="app" style:grid-template-rows={openTab === null ? 'var(--tabbar-h) 1fr' : undefined}>
	<aside id="sidebar">
		<div id="tab-list">
			{#each tabs as tab (tab.id)}
				<div
					class="tab-item {tab.id === openTab ? 'active' : ''}"
					animate:flip={{ duration: 200, easing: cubicOut }}
					in:reveal
					out:drop
					role="tab"
					aria-selected={tab.id === openTab}
					tabindex={0}
					onclick={() => selectTab(tab.id)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							selectTab(tab.id);
						}
					}}
				>
					<div class="tab-icon">
						<i class={tab.type === 'browser' ? 'fa-solid fa-globe' : 'fa-solid fa-gamepad'}></i>
					</div>
					<span class="tab-title">{tab.label}</span>
					<button
						class="tab-close"
						title="close tab"
						aria-label="close tab"
						onclick={(e) => {
							e.stopPropagation();
							closeTab(tab.id);
						}}><i class="fa-solid fa-xmark"></i></button
					>
				</div>
			{/each}
			<button id="add-tab-btn" aria-label="new tab" onclick={newTab}>
				<div class="tab-icon"><i class="fa-solid fa-plus"></i></div>
			</button>
		</div>
	</aside>

	{#if openTab !== null}
		<Omnibox
			url={currentUrl}
			canBack={canGoBack}
			canForward={canGoForward}
			{canReload}
			onBack={goBack}
			onForward={goForward}
			onReload={reload}
			onNavigate={navigateOmnibox}
		/>
	{/if}

	<main id="content">
		{#if tabs.length === 0}
			<div id="no-tabs" in:fadeUp>
				<div id="no-tabs-icon"><i class="fa-regular fa-window-restore"></i></div>
				<div id="no-tabs-hint">no tabs open</div>
			</div>
		{/if}

		{#if activeTab && activeTab.type !== 'games' && activeTab.content}
			<div class="page-backdrop"></div>
		{/if}

		<div class="frames" bind:this={frameContainer}></div>

		{#if activeTab && !activeTab.content && activeTab.type !== 'games'}
			<NewTab
				draft={activeTab.searchDraft ?? ''}
				splashText={splashFor(activeTab)}
				onSearch={submitSearch}
				onShortcut={(s) => s === 'games' && openGamesTab()}
				onDraftChange={(v) => setDraft(activeTab, v)}
				onSplashClick={() => rotateSplash(activeTab)}
			/>
		{/if}

		{#if activeTab?.type === 'games'}
			<Games onOpenZone={openGame} />
		{/if}

		{#if activeTab?.loading}
			<div class="loading-overlay" transition:fade={{ duration: 150 }}>
				<span><img class="loader-gif" src={loadingGif} alt="loader" />Loading...</span>
			</div>
		{/if}

		{#if activeTab?.error}
			<div class="load-error" transition:fade={{ duration: 150 }}>
				<div class="load-error-box">
					<i class="fa-solid fa-triangle-exclamation"></i>
					<span>{activeTab.error}</span>
					<button
						type="button"
						onclick={() =>
							activeTab.type === 'game'
								? loadGame(activeTab.id, activeTab.zone)
								: loadProxy(activeTab.content)}
					>
						try again
					</button>
				</div>
			</div>
		{/if}
	</main>
</div>

<style>
	#app {
		display: grid;
		grid-template-rows: var(--tabbar-h) var(--omnibox-h) 1fr;
		height: 100vh;
		position: relative;
		z-index: 1;
	}

	#sidebar {
		background: var(--bg-deep);
		border-bottom: 1px solid var(--border);
		overflow: hidden;
		z-index: 10;
		display: flex;
	}

	#tab-list {
		flex: 1;
		overflow-x: auto;
		overflow-y: hidden;
		display: flex;
		flex-direction: row;
		scrollbar-width: none;
	}

	#tab-list::-webkit-scrollbar {
		display: none;
	}

	.tab-item,
	#add-tab-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 10px;
		cursor: pointer;
		border: none;
		border-right: 1px solid var(--border);
		height: var(--tabbar-h);
		min-width: 120px;
		max-width: 200px;
		text-align: left;
		font-family: inherit;
		color: inherit;
		background: transparent;
		flex-shrink: 0;
	}

	.tab-item.active {
		background: var(--tab-active-bg);
	}

	.tab-icon {
		width: 14px;
		height: 14px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		margin-top: 1px;
	}

	.tab-icon i {
		font-size: 11px;
		color: var(--text-dim);
	}

	.tab-item.active .tab-icon i {
		color: var(--accent);
	}

	.tab-title {
		flex: 1;
		font-size: 11px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--text-dim);
		position: relative;
		top: 1px;
	}

	.tab-item.active .tab-title {
		color: var(--text-on-active);
		font-weight: 600;
	}

	.tab-close {
		width: 16px;
		height: 16px;
		border: none;
		background: transparent;
		color: var(--text-dim);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0;
		opacity: 0;
		font-size: 10px;
	}

	.tab-item:hover .tab-close {
		opacity: 1;
	}

	.tab-item.active .tab-close {
		color: var(--accent);
		opacity: 0;
	}

	.tab-item.active:hover .tab-close {
		opacity: 1;
	}

	#add-tab-btn {
		min-width: unset;
		max-width: unset;
		padding: 0 12px;
		border-right: none;
		font-size: 12px;
		position: relative;
		top: 1px;
	}

	#add-tab-btn .tab-icon i {
		font-size: 11px;
		color: var(--text-dim);
	}

	#content {
		position: relative;
		background: transparent;
		overflow: hidden;
	}

	/* white sheet behind frames so transparent pages stay readable */
	.page-backdrop {
		position: absolute;
		inset: 0;
		background: #fff;
	}

	.frames {
		position: absolute;
		inset: 0;
	}

	/* the iframes are created outside of svelte, so they carry no scoping hash */
	:global(.frames iframe.frame) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: none;
		background: transparent;
	}

	.loading-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--accent);
		font-size: 24px;
		font-weight: 700;
		pointer-events: none;
		z-index: 6;
	}

	.loading-overlay .pulse {
		animation: pulse 1.5s ease-in-out infinite;
	}

	.loading-overlay .loader-gif {
		width: 28px;
		height: 28px;
		margin-right: 8px;
	}

	.load-error {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		z-index: 6;
	}

	.load-error-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 20px 28px;
		border: 2px solid var(--border);
		border-radius: 12px;
		background: var(--bg-deep);
		color: var(--red);
		font-size: 14px;
		max-width: 80%;
		text-align: center;
		pointer-events: auto;
	}

	.load-error-box i {
		font-size: 24px;
	}

	.load-error-box button {
		padding: 6px 16px;
		border-radius: 10px;
		border: 2px solid var(--border);
		background: var(--bg);
		color: var(--text);
		font-family: inherit;
		font-size: 13px;
		cursor: pointer;
	}

	.load-error-box button:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	@keyframes pulse {
		50% {
			opacity: 0.4;
		}
	}

	#no-tabs {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		pointer-events: none;
	}

	#no-tabs-icon {
		font-size: 48px;
		color: var(--accent);
	}

	#no-tabs-hint {
		font-size: 11px;
		color: var(--text-muted);
		letter-spacing: 0.06em;
	}
</style>
