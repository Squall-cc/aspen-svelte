<script>
	import 'virtual:uno.css';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	onMount(() => {
		const stale = localStorage.getItem('bare-mux-path');
		if (stale && stale !== './io/worker.js') localStorage.removeItem('bare-mux-path');
		if (!localStorage.getItem('wispUrl')) {
			localStorage.setItem('wispUrl', 'wss://monaco-edu.online/wisp/');
		}
		const transport = localStorage.getItem('transport');
		if (transport !== 'epoxy' && transport !== 'libcurl') {
			localStorage.setItem('transport', 'epoxy');
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@200..700&display=swap" rel="stylesheet" />
	<script src="./static/all.js"></script>
	<script src="./io/index.js"></script>
</svelte:head>

<style>
	:global(html, body) {
		font-family: 'Readex Pro', system-ui, sans-serif;
		cursor: url('./cursor.svg'), auto;
	}
	:global(button, a, [role='button']) {
		cursor: url('./cursor.svg'), pointer;
	}
</style>

{@render children()}
