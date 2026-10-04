<script>
	let {
		url = '',
		canBack = false,
		canForward = false,
		canReload = false,
		onBack,
		onForward,
		onReload,
		onNavigate
	} = $props();

	let input = $state('');
	let focused = $state(false);

	$effect(() => {
		if (!focused) input = url;
	});

	function submit(e) {
		e.preventDefault();
		const value = input.trim();
		if (!value) return;
		onNavigate?.(value);
	}
</script>

<div id="omnibox">
	<button id="omni-back" disabled={!canBack} onclick={onBack} aria-label="back">
		<i class="fa-solid fa-arrow-left"></i>
	</button>
	<button id="omni-fwd" disabled={!canForward} onclick={onForward} aria-label="forward">
		<i class="fa-solid fa-arrow-right"></i>
	</button>
	<button id="omni-reload" disabled={!canReload} onclick={onReload} aria-label="reload">
		<i class="fa-solid fa-rotate-right"></i>
	</button>

	<form class="omnibox-form" onsubmit={submit}>
		<input
			id="omnibox-input"
			type="text"
			placeholder="search or enter url..."
			bind:value={input}
			onfocus={() => (focused = true)}
			onblur={() => (focused = false)}
		/>
	</form>
</div>

<style>
	#omnibox {
		background: var(--bg-deep);
		border-bottom: 1px solid var(--border);
		display: flex;
		align-items: center;
		padding: 0 8px;
		gap: 4px;
		z-index: 10;
	}

	#omnibox button {
		background: none;
		border: none;
		color: var(--text-dim);
		cursor: pointer;
		padding: 4px 7px;
		font-size: 13px;
		line-height: 1;
	}

	#omnibox button:hover {
		color: var(--text);
	}

	#omnibox button:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.omnibox-form {
		flex: 1;
		display: contents;
	}

	#omnibox-input {
		flex: 1;
		border: 2px solid var(--border);
		color: var(--text);
		font-family: inherit;
		font-size: 13px;
		padding: 4px 10px;
		border-radius: 10px;
		outline: none;
		background: var(--surface);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-color: var(--border-glass);
	}

	#omnibox-input::placeholder {
		color: var(--text-muted);
	}

	#omnibox-input:focus {
		border-color: var(--accent);
	}
</style>
