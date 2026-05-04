<script>
	import 'virtual:uno.css';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
	let vantaEffect;

	onMount(() => {
		if (!localStorage.getItem('wispUrl')) {
			localStorage.setItem('wispUrl', 'wss://gointospace.app/wisp/');
		}
		const transport = localStorage.getItem('transport');
		if (transport !== 'epoxy' && transport !== 'libcurl') {
			localStorage.setItem('transport', 'epoxy');
		}

		vantaEffect = window.VANTA.TOPOLOGY({
			el: '#vanta-bg',
			color: 0xa7c080,
			backgroundColor: 0x333c43
		});

		return () => vantaEffect?.destroy();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<script src="/scram/scramjet.all.js"></script>
	<script src="/baremux/index.js"></script>
	<script src="/bg.js"></script>
</svelte:head>

<div id="vanta-bg" class="fixed inset-0 -z-10"></div>
{@render children()}
