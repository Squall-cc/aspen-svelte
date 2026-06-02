<script lang="ts">
  let {
    currentUrl = '',
    canGoBack = false,
    canGoForward = false,
    onback,
    onforward,
    onreload,
  }: {
    currentUrl?: string
    canGoBack?: boolean
    canGoForward?: boolean
    onback?: () => void
    onforward?: () => void
    onreload?: () => void
  } = $props()
</script>

<div class="flex items-center gap-1 px-2 py-1 bg-ef-bg-deep border-b border-ef-border min-h-[36px]">
  <button
    class="px-2 py-1 rounded text-ef-text-dim hover:text-ef-accent disabled:opacity-30 disabled:cursor-default"
    disabled={!canGoBack}
    onclick={onback}
    aria-label="back"
  ><i class="fa-solid fa-arrow-left text-sm"></i></button>

  <button
    class="px-2 py-1 rounded text-ef-text-dim hover:text-ef-accent disabled:opacity-30 disabled:cursor-default"
    disabled={!canGoForward}
    onclick={onforward}
    aria-label="forward"
  ><i class="fa-solid fa-arrow-right text-sm"></i></button>

  <button
    class="px-2 py-1 rounded text-ef-text-dim hover:text-ef-accent"
    onclick={onreload}
    aria-label="reload"
  ><i class="fa-solid fa-rotate-right text-sm"></i></button>

  {#if currentUrl}
    <span class="ml-2 text-xs text-ef-text-muted truncate max-w-xs">{currentUrl}</span>
  {/if}
</div>
