<script>
	import { fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	let {
		draft = '',
		splashText = '',
		onSearch,
		onShortcut,
		onDraftChange,
		onSplashClick
	} = $props();

	const shortcuts = [{ label: 'games', fa: 'fa-solid fa-gamepad' }];

	function fadeUp(node, { duration = 350, delay = 0, y = 18 } = {}) {
		return {
			duration,
			delay,
			easing: cubicOut,
			css: (t) => `opacity: ${t}; transform: translateY(${(1 - t) * y}px)`
		};
	}
</script>

<div class="newtab-overlay">
	<div class="newtab-center">
		<div class="branding" in:fade={{ duration: 300 }}>aspen</div>
		<div class="splash" title="click me" onclick={onSplashClick}>{splashText}</div>
		<input
			type="text"
			placeholder="search the web freely"
			value={draft}
			oninput={(e) => onDraftChange?.(e.currentTarget.value)}
			onkeydown={(e) => {
				const value = draft.trim();
				if (e.key === 'Enter' && value) onSearch?.(value);
			}}
			in:fadeUp={{ delay: 50 }}
		/>
		<div class="shortcut-row" in:fadeUp={{ delay: 150 }}>
			{#each shortcuts as s (s.label)}
				<button class="shortcut-btn" onclick={() => onShortcut?.(s.label)}>
					<i class={s.fa} style="font-size:20px"></i>
					<span>{s.label}</span>
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.newtab-overlay {
		position: absolute;
		inset: 0;
		background: transparent;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 5;
		overflow: hidden;
	}

	.newtab-center {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
	}

	.branding {
		font-size: 42px;
		font-weight: 700;
		color: var(--accent);
		margin-bottom: 4px;
		letter-spacing: -0.5px;
		user-select: none;
	}

	.splash {
		font-size: 13px;
		color: var(--text-muted);
		margin-bottom: 14px;
		cursor: pointer;
		user-select: none;
		transition: opacity 0.15s;
	}

	.newtab-overlay input[type='text'] {
		width: 100%;
		max-width: 480px;
		padding: 10px 14px;
		border: 2px solid var(--border-glass);
		border-radius: 10px;
		color: var(--text);
		font-family: inherit;
		font-size: 14px;
		outline: none;
		background: var(--surface);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.newtab-overlay input[type='text']::placeholder {
		color: var(--text-muted);
	}

	.newtab-overlay input[type='text']:focus {
		border-color: var(--accent);
	}

	.shortcut-row {
		display: flex;
		gap: 12px;
		margin-top: 14px;
		flex-wrap: wrap;
		justify-content: center;
	}

	.shortcut-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 10px 18px;
		border: 2px solid var(--border-glass);
		border-radius: 12px;
		color: var(--text-muted);
		font-family: inherit;
		font-size: 11px;
		cursor: pointer;
		text-decoration: none;
		transition:
			border-color 0.15s,
			color 0.15s,
			transform 0.15s;
		background: var(--surface);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.shortcut-btn:hover {
		border-color: var(--accent);
		color: var(--text);
		transform: scale(1.08);
	}
</style>
