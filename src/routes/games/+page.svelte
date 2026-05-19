<script lang="civet">
  import { onMount } from 'svelte'

  let games = $state([])
  let loading = $state(true)
  let error = $state('')
  let activeGame = $state<string | null>(null)
  let gameUrl = $state('')
  let gameLoading = $state(false)

  onMount =>
    script := document.createElement('script')
    script.src = './lumin.js'
    script.onload = async () =>
      try
        Lumin := (window as any).Lumin
        await Lumin.init({ headless: true })
        { games: g } := await Lumin.getGames({ page: 1, limit: 40 })
        for game of g
          imgUrl := await Lumin.getImageUrl(game.image_token)
          game.imgUrl = imgUrl
        games = g
      catch e
        error = String(e)
      finally
        loading = false
    document.head.appendChild(script)

  loadGame := async (id: string) =>
    gameLoading = true
    activeGame = id
    try
      Lumin := (window as any).Lumin
      { url } := await Lumin.getGameUrl(id)
      gameUrl = url
    catch e
      error = String(e)
    gameLoading = false

  back := =>
    activeGame = null
    gameUrl = ''
</script>

<div class="flex flex-col h-screen bg-ef-bg text-ef-text">
  {#if activeGame}
    <div class="flex items-center gap-3 p-2 bg-ef-bg-deep border-b border-ef-border">
      <button
        class="px-3 py-1.5 bg-ef-bg border-2 border-ef-text-dim text-ef-text-dim rounded-lg hover:border-ef-accent hover:text-ef-accent font-medium text-sm"
        onclick={back}
      >← back</button>
    </div>
    <div class="grow relative">
      {#if gameLoading}
        <div class="absolute inset-0 flex items-center justify-center text-ef-accent text-2xl font-bold">loading...</div>
      {:else if gameUrl}
        <iframe src={gameUrl} class="w-full h-full border-none" allow="fullscreen"></iframe>
      {/if}
    </div>
  {:else}
    <div class="flex items-center px-4 py-3 bg-ef-bg-deep border-b border-ef-border">
      <h1 class="text-xl font-bold text-ef-accent">games</h1>
    </div>
    <div class="grow overflow-y-auto p-4">
      {#if loading}
        <div class="flex items-center justify-center h-full text-ef-accent text-2xl font-bold">loading...</div>
      {:else if error}
        <div class="flex items-center justify-center h-full text-ef-red text-lg">{error}</div>
      {:else}
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {#each games as game}
            <button
              class="flex flex-col rounded-xl overflow-hidden border-2 border-ef-text-dim hover:border-ef-accent bg-ef-bg-deep transition-colors text-left"
              onclick={() => loadGame(game.id)}
            >
              {#if game.imgUrl}
                <img src={game.imgUrl} alt={game.name} class="w-full aspect-video object-cover" />
              {:else}
                <div class="w-full aspect-video bg-ef-bg flex items-center justify-center text-ef-text-muted text-xs">no img</div>
              {/if}
              <div class="px-2 py-1.5 text-sm font-medium text-ef-text truncate">{game.name}</div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
