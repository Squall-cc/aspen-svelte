<script>
	import { fade } from 'svelte/transition';
	import { getZones } from '$lib/zones.js';
	import svelteTilt from 'vanilla-tilt-svelte';

	let { onOpenZone } = $props();

	let zones = $state([]);
	let zonesLoading = $state(false);
	let zonesError = $state('');
	let gamesSearch = $state('');
	let gamesPage = $state(1);

	const gamesPerPage = 40;

	const filteredZones = $derived(
		gamesSearch.trim()
			? zones.filter((z) => z.name.toLowerCase().includes(gamesSearch.trim().toLowerCase()))
			: zones
	);
	const pagedZones = $derived.by(() => {
		const start = (gamesPage - 1) * gamesPerPage;
		return filteredZones.slice(start, start + gamesPerPage);
	});
	const totalPages = $derived(Math.max(1, Math.ceil(filteredZones.length / gamesPerPage)));

	$effect(() => {
		gamesPage;
		if (gamesPage > totalPages) gamesPage = totalPages;
	});

	async function loadZones() {
		if (zones.length || zonesLoading) return;
		zonesLoading = true;
		zonesError = '';
		try {
			zones = await getZones();
		} catch (e) {
			zonesError = String(e);
		}
		zonesLoading = false;
	}
	loadZones();
</script>

<div class="games-overlay" transition:fade={{ duration: 150 }}>
	<div class="top-bar">
		<h1>games</h1>
		<span class="count">{filteredZones.length}</span>
		<input
			type="text"
			placeholder="Search games..."
			bind:value={gamesSearch}
			oninput={() => (gamesPage = 1)}
		/>
		{#if totalPages > 1}
			<button
				class="page-btn"
				disabled={gamesPage <= 1}
				onclick={() => gamesPage--}
				aria-label="previous page"
			>
				<i class="fa-solid fa-chevron-left"></i>
			</button>
			<span class="page-info">{gamesPage} / {totalPages}</span>
			<button
				class="page-btn"
				disabled={gamesPage >= totalPages}
				onclick={() => gamesPage++}
				aria-label="next page"
			>
				<i class="fa-solid fa-chevron-right"></i>
			</button>
		{/if}
	</div>

	<div class="grid-wrap">
		{#if zonesLoading}
			<div class="status"><span class="pulse">loading...</span></div>
		{:else if zonesError}
			<div class="status status-error">
				<span>{zonesError}</span>
				<button class="retry" onclick={loadZones}>retry</button>
			</div>
		{:else}
			<div class="grid">
				{#each pagedZones as zone (zone.id)}
					<button
						class="card"
						use:svelteTilt={{
							max: 10,
							perspective: 800,
							scale: 1.04,
							speed: 300,
							glare: true,
							'max-glare': 0.2
						}}
						onclick={() => onOpenZone(zone)}
					>
						<img src={zone.cover} alt={zone.name} loading="lazy" />
						<span>{zone.name}</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.games-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		z-index: 5;
		background: transparent;
	}

	.top-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px 24px;
		background: var(--bg-deep);
		border-bottom: 1px solid var(--border);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.top-bar h1 {
		font-size: 18px;
		font-weight: 700;
		margin-right: auto;
	}

	.top-bar input {
		padding: 8px 14px;
		border-radius: 10px;
		border: 2px solid var(--border);
		background: var(--surface);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		color: var(--text);
		font-family: inherit;
		font-size: 14px;
		width: 220px;
		outline: none;
	}

	.top-bar input::placeholder {
		color: var(--text-muted);
	}

	.top-bar input:focus {
		border-color: var(--accent);
	}

	.count {
		font-size: 13px;
		color: var(--text-muted);
	}

	.page-btn {
		padding: 8px 12px;
		border-radius: 10px;
		border: 2px solid var(--border);
		background: var(--surface);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		color: var(--text);
		font-family: inherit;
		font-size: 13px;
		cursor: pointer;
		outline: none;
	}

	.page-btn:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.page-btn:not(:disabled):hover {
		border-color: var(--accent);
	}

	.page-info {
		font-size: 13px;
		color: var(--text-muted);
	}

	.grid-wrap {
		flex: 1;
		overflow-y: auto;
		position: relative;
		z-index: 1;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(10, 1fr);
		gap: 16px;
		padding: 24px;
	}

	@media (max-width: 1200px) {
		.grid {
			grid-template-columns: repeat(5, 1fr);
		}
	}

	@media (max-width: 640px) {
		.grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.card {
		border-radius: 12px;
		overflow: hidden;
		cursor: pointer;
		transition: transform 0.15s;
		text-decoration: none;
		color: inherit;
		font-family: inherit;
		border: 2px solid var(--border);
		position: relative;
		background: var(--surface);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		padding: 0;
		text-align: left;
	}

	.card:hover {
		transform: translateY(-4px) scale(1.05);
	}

	.card img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		display: block;
		background: var(--bg);
	}

	.card span {
		display: block;
		padding: 10px 12px;
		font-size: 13px;
		font-weight: 500;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.status {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		height: 100%;
		color: var(--text);
		font-size: 24px;
		font-weight: 700;
		padding: 24px;
		text-align: center;
	}

	.status-error {
		color: var(--red);
		font-size: 16px;
	}

	.status .pulse {
		animation: pulse 1.5s ease-in-out infinite;
	}

	@keyframes pulse {
		50% {
			opacity: 0.4;
		}
	}

	.retry {
		padding: 8px 16px;
		border-radius: 10px;
		border: 2px solid var(--border);
		background: var(--bg);
		color: var(--text);
		font-family: inherit;
		font-size: 14px;
		cursor: pointer;
	}

	.retry:hover {
		border-color: var(--accent);
	}
</style>
