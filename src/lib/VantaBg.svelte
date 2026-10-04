<script>
	import { onMount, onDestroy } from 'svelte';
	import { getVantaColors, subscribeTheme } from './theme.js';

	let el;
	let effect = null;

	const make = (color, backgroundColor) =>
		globalThis.VANTA.TOPOLOGY({
			el,
			mouseControls: true,
			touchControls: true,
			gyroControls: false,
			minHeight: 200,
			minWidth: 200,
			scale: 1,
			scaleMobile: 1,
			color,
			backgroundColor
		});

	const start = (color, backgroundColor) => {
		if (!globalThis.VANTA || !el) return;
		try {
			effect?.destroy();
		} catch {}
		effect = make(color, backgroundColor);
	};

	// the modified build has no setOptions, so recreate on theme change
	const unsub = subscribeTheme((_id, theme) => start(theme.vantaColor, theme.vantaBg));

	onMount(async () => {
		// lazy load for perf, and skip it on battery (like the old site)
		if (navigator.getBattery) {
			try {
				const battery = await navigator.getBattery();
				if (!battery.charging && battery.level < 0.25) return;
			} catch {}
		}
		await import('../vendor/vanta.js');
		const { color, backgroundColor } = getVantaColors();
		start(color, backgroundColor);
	});

	onDestroy(() => {
		unsub();
		try {
			effect?.destroy();
		} catch {}
	});
</script>

<div id="vanta-bg" bind:this={el}></div>

<style>
	#vanta-bg {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 0;
	}
</style>
