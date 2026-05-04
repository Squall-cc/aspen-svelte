<script>
	import 'virtual:uno.css';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	onMount(() => {
		if (!localStorage.getItem('wispUrl')) {
			localStorage.setItem('wispUrl', 'wss://gointospace.app/wisp/');
		}
		const transport = localStorage.getItem('transport');
		if (transport !== 'epoxy' && transport !== 'libcurl') {
			localStorage.setItem('transport', 'epoxy');
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<script src="/scram/scramjet.all.js"></script>
	<script src="/baremux/index.js"></script>
</svelte:head>
{@render children()}
