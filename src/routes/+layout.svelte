<script>
	import 'virtual:uno.css';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	function loadScript(src) {
		return new Promise((resolve, reject) => {
			const s = document.createElement('script');
			s.src = src;
			s.onload = resolve;
			s.onerror = reject;
			document.head.appendChild(s);
		});
	}

	onMount(async () => {
		if (!localStorage.getItem('wispUrl')) {
			localStorage.setItem('wispUrl', 'wss://monaco-edu.online/wisp/');
		}
		const transport = localStorage.getItem('transport');
		if (transport !== 'epoxy' && transport !== 'libcurl') {
			localStorage.setItem('transport', 'epoxy');
		}
		await loadScript('./static/all.js');
		await loadScript('./io/index.js');
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@200..700&display=swap" rel="stylesheet" />
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" />
{@html `<style>html,body{font-family:'Readex Pro',system-ui,sans-serif;cursor:url(./cursor.svg),auto}button,a,[role=button]{cursor:url(./cursor.svg),pointer}</style>`}
</svelte:head>

{@render children()}
