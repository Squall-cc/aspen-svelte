<script lang="ts">
  let {
    currentUrl = '',
    canGoBack = false,
    canGoForward = false,
    onback,
    onforward,
    onreload,
    onnavigate,
  }: {
    currentUrl?: string
    canGoBack?: boolean
    canGoForward?: boolean
    onback?: () => void
    onforward?: () => void
    onreload?: () => void
    onnavigate?: (url: string) => void
  } = $props()

  let inputValue = $state('')
  let focused = $state(false)

  $effect(() => {
    if (!focused) inputValue = currentUrl
  })

  function submit() {
    const val = inputValue.trim()
    if (val) onnavigate?.(val)
    focused = false
  }
</script>

<div class="flex items-center gap-1 px-2 py-1 bg-ef-bg-deep border-b border-ef-border min-h-[36px]">
  <button
    class="px-2 py-1 border-2 border-ef-text-dim rounded-lg text-ef-text-dim hover:border-ef-accent hover:text-ef-accent disabled:opacity-30 disabled:cursor-default"
    disabled={!canGoBack}
    onclick={onback}
    aria-label="back"
  ><i class="fa-solid fa-arrow-left text-sm"></i></button>

  <button
    class="px-2 py-1 border-2 border-ef-text-dim rounded-lg text-ef-text-dim hover:border-ef-accent hover:text-ef-accent disabled:opacity-30 disabled:cursor-default"
    disabled={!canGoForward}
    onclick={onforward}
    aria-label="forward"
  ><i class="fa-solid fa-arrow-right text-sm"></i></button>

  <button
    class="px-2 py-1 border-2 border-ef-text-dim rounded-lg text-ef-text-dim hover:border-ef-accent hover:text-ef-accent"
    onclick={onreload}
    aria-label="reload"
  ><i class="fa-solid fa-rotate-right text-sm"></i></button>

  <form
    class="flex-1 mx-2"
    onsubmit={(e) => { e.preventDefault(); submit() }}
  >
    <input
      type="text"
      bind:value={inputValue}
      onfocus={() => { focused = true; inputValue = currentUrl }}
      onblur={() => { focused = false; inputValue = currentUrl }}
      placeholder="search or url"
      class="w-full px-3 py-1 bg-ef-bg border border-ef-text-dim rounded-lg text-ef-text text-xs placeholder-ef-text-muted outline-none focus:border-ef-accent"
    />
  </form>
</div>
