<script lang="civet">
  import { onMount } from 'svelte'
  import { search } from '$lib/search.js'
  import { registerSW } from '$lib/registerSW.js'
  import svelteTilt from 'vanilla-tilt-svelte'
  import Toolbar from '$lib/Toolbar.svelte'
  import { fly } from 'svelte/transition'

  let tabs = $state([])
  let openTab = $state(null)
  let frameContainer: HTMLDivElement
  let connection: any
  let scramjet: any
  let activeFrame: any
  let swReady = false
  let frameLoading = $state(false)
  let skipNextUrlChange = false

  // per-tab history: Map<tabId, { stack: string[], idx: number }>
  let tabHistories = new Map<number, { stack: string[], idx: number }>()
  let currentUrl = $state('')
  let canGoBack = $state(false)
  let canGoForward = $state(false)

  // gamz
  let gamesLoaded = $state(false)
  let gamesLoading = $state(false)
  let gamesError = $state('')
  let allGames = $state([])
  let gamesSearch = $state('')
  let gamesPage = $state(1)

  gamesPerPage := 40

  filteredGames := $derived(
    if gamesSearch.trim()
      allGames.filter (g: any) => g.name.toLowerCase().includes(gamesSearch.toLowerCase())
    else
      allGames
  )

  pagedGames := $derived(do
    start := (gamesPage - 1) * gamesPerPage
    filteredGames.slice(start, start + gamesPerPage)
  )

  totalPages := $derived(Math.max(1, Math.ceil(filteredGames.length / gamesPerPage)))

  // active game in tab
  let activeGame = $state<string | null>(null)
  let gameUrl = $state('')
  let gameLoading = $state(false)

  searchEngine := 'https://duckduckgo.com/?q=%s'

  onMount =>
    base := new URL('./', location.href).pathname
    workerUrl := new URL('./io/worker.js', location.href).href

    initScramjet := =>
      { ScramjetController } := (window as any).$scramjetLoadController()
      scramjet = new ScramjetController
        prefix: `${base}~/`
        files:
          wasm: `${base}static/wasm.wasm`
          all: `${base}static/all.js`
          sync: `${base}static/sync.js`
      scramjet.init()
      connection = new (window as any).BareMux.BareMuxConnection(workerUrl)

    // wipe stale scramjet IDB then init
    req := indexedDB.deleteDatabase('$scramjet')
    req.onsuccess = initScramjet
    req.onerror = initScramjet
    req.onblocked = initScramjet

  loadGames := async () =>
    return if gamesLoaded or gamesLoading
    gamesLoading = true
    gamesError = ''
    try
      loadScript := (src: string) =>
        new Promise<void> (resolve, reject) =>
          s := document.createElement('script')
          s.src = src
          s.onload = resolve
          s.onerror = reject
          document.head.appendChild(s)

      await loadScript('./lumin.js')
      Lumin := (window as any).Lumin
      await Lumin.init({ headless: true })
      pageSize := 50
      first := await Lumin.getGames({ page: 1, limit: pageSize })
      collected := [...first.games]
      for p of Array.from({ length: first.pages - 1 }, (_, i) => i + 2)
        { games: more } := await Lumin.getGames({ page: p, limit: pageSize })
        collected.push(...more)
      for game of collected
        try
          game.imgUrl = await Lumin.getImageUrl(game.image_token)
        catch
          game.imgUrl = null
      allGames = collected
      gamesLoaded = true
    catch e
      gamesError = String(e)
    gamesLoading = false

  openGamesTab := =>
    tab := tabs.find (t) => t.id is openTab
    if tab
      tab.type = 'games'
      tab.label = 'games'
      tab.content = null
      activeGame = null
      gameUrl = ''
      frameContainer.innerHTML = '' if frameContainer
      // scramjet history stuff
      activeFrame = null
      currentUrl = ''
      canGoBack = false
      canGoForward = false
    loadGames()

  loadGame := async (id: string) =>
    gameLoading = true
    activeGame = id
    try
      Lumin := (window as any).Lumin
      { url } := await Lumin.getGameUrl(id)
      gameUrl = url
    catch e
      gamesError = String(e)
    gameLoading = false

  backFromGame := =>
    activeGame = null
    gameUrl = ''

  loadProxy := async (rawUrl: string) =>
    if not swReady
      await registerSW()
      await navigator.serviceWorker.ready
      if navigator.serviceWorker.controller is null
        await new Promise<void> (resolve) =>
          navigator.serviceWorker.addEventListener 'controllerchange', () => resolve(), { once: true }
      swReady = true

    while not connection
      await new Promise (r) => setTimeout(r, 30)

    url := search(rawUrl, searchEngine)
    wispUrl := localStorage.getItem('wispUrl')
    transportType := 'epoxy'
    localStorage.setItem('transport', transportType)

    relPath := if transportType is 'epoxy' then './net/index.mjs' else './curl/index.mjs'
    transportPath := new URL(relPath, location.href).href
    transportConfig := if transportType is 'epoxy'
      [{ wisp: wispUrl }]
    else
      [{ websocket: wispUrl }]

    if (await connection.getTransport()) is not transportPath
      await connection.setTransport(transportPath, transportConfig)

    frameContainer.innerHTML = ''
    activeFrame = null

    frame := scramjet.createFrame()
    iframe := frame.frame as HTMLIFrameElement
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = 'none'
    frameContainer.appendChild(iframe)
    activeFrame = frame

    // push to this tabs history
    if openTab is not null
      h := tabHistories.get(openTab) ?? { stack: [], idx: -1 }
      h.stack = h.stack.slice(0, h.idx + 1)
      h.stack.push(url)
      h.idx = h.stack.length - 1
      tabHistories.set(openTab, h)
      currentUrl = url
      canGoBack = h.idx > 0
      canGoForward = false

    // update current url on in-page navigation
    frame.addEventListener 'urlchange', (e: any) =>
      if skipNextUrlChange
        skipNextUrlChange = false
        return
      decoded := scramjet.decodeUrl(e.url)
      currentUrl = decoded
      if openTab is not null
        h := tabHistories.get(openTab)
        if h
          if decoded isnt h.stack[h.idx]
            h.stack = h.stack.slice(0, h.idx + 1)
            h.stack.push(decoded)
            h.idx = h.stack.length - 1
          canGoBack = h.idx > 0
          canGoForward = h.idx < h.stack.length - 1

    frameLoading = true
    iframe.addEventListener 'load', () =>
      frameLoading = false
    skipNextUrlChange = true
    frame.go(url)

  goBack := =>
    return unless openTab is not null
    h := tabHistories.get(openTab)
    return unless h and h.idx > 0
    h.idx--
    currentUrl = h.stack[h.idx]
    canGoBack = h.idx > 0
    canGoForward = true
    activeFrame?.back()

  goForward := =>
    return unless openTab is not null
    h := tabHistories.get(openTab)
    return unless h and h.idx < h.stack.length - 1
    h.idx++
    currentUrl = h.stack[h.idx]
    canGoBack = true
    canGoForward = h.idx < h.stack.length - 1
    activeFrame?.forward()

  reload := =>
    activeFrame?.reload()

  // toolbar searchbar
  navigateToolbar := (raw: string) =>
    url := if linkRegex.test(raw) then raw else `${searxUrl}${encodeURIComponent(raw)}`
    tab := tabs.find (t) => t.id is openTab
    if tab
      tab.content = url
      tab.label = labelFor(url)
      tab.type = 'browser'
    loadProxy(url) if frameContainer
  
  logHistory := (entry: string) => // would cookies/localstorage bes faster or somethn
    existing := JSON.parse(localStorage.getItem('history') ?? '[]')
    existing.push(entry)
    localStorage.setItem('history', JSON.stringify(existing))

    
  toggle := (id: number) =>
    if openTab is id
      openTab = null
      currentUrl = ''
      canGoBack = false
      canGoForward = false
    else
      openTab = id
      tab := tabs.find (t) => t.id is id
      // restore history state for this tab
      h := tabHistories.get(id)
      if h
        currentUrl = h.stack[h.idx] ?? ''
        canGoBack = h.idx > 0
        canGoForward = h.idx < h.stack.length - 1
      else
        currentUrl = ''
        canGoBack = false
        canGoForward = false
      if tab?.type is 'games'
        frameContainer.innerHTML = '' if frameContainer
        activeFrame = null
        loadGames()
      else if tab?.content and frameContainer
        loadProxy(tab.content)
      else if frameContainer
        frameContainer.innerHTML = ''
        activeFrame = null
  // regex from stack overflow
  linkRegex := /^(([a-z]+:\/\/)?(([a-z0-9\-]+\.)+([a-z]{2}|aero|arpa|biz|com|coop|edu|gov|info|int|jobs|mil|museum|name|nato|net|org|pro|travel|local|internal))(:[0-9]{1,5})?(\/[a-z0-9_\-\.~]+)*(\/([a-z0-9_\-\.]*)(\?[a-z0-9+_\-\.%=&]*)?)?(#[a-zA-Z0-9!$&'()*+.=\-_~:@\/?]*)?)$/i

  searxUrl := 'https://www.metacrawler.com/serp?q='

  let searchInput = $state('')

  activeTab := $derived(tabs.find (t) => t.id is openTab)
  isGamesTab := $derived(activeTab?.type is 'games')

  labelFor := (raw: string) =>
    normalized := if /^https?:\/\//.test(raw) then raw else `https://${raw}`
    try
      host := new URL(normalized).hostname.replace(/^www\./, '')
      host.slice(0, 20) or 'new tab'
    catch
      raw.slice(0, 20) or 'new tab'

  newTab := =>
    id := (Math.max(0, ...tabs.map (t) => t.id)) + 1
    tabs.push { id, label: 'new tab', content: null, type: 'browser' }
    openTab = id
    activeGame = null
    gameUrl = ''
    frameContainer.innerHTML = '' if frameContainer

  submitSearch := =>
    raw := searchInput.trim()
    return unless raw
    url := if linkRegex.test(raw) then raw else `${searxUrl}${encodeURIComponent(raw)}`
    if openTab is null
      id := (Math.max(0, ...tabs.map (t) => t.id)) + 1
      tabs.push { id, label: labelFor(url), content: url, type: 'browser' }
      openTab = id
    else
      tab := tabs.find (t) => t.id is openTab
      if tab
        tab.content = url
        tab.label = labelFor url
        tab.type = 'browser'
    loadProxy(url) if frameContainer
    searchInput = ''

  closeTab := (id: number) =>
    tabHistories.delete(id)
    tabs = tabs.filter (t) => t.id is not id
    if openTab is id
      openTab = null
      activeFrame = null
      currentUrl = ''
      canGoBack = false
      canGoForward = false
      frameContainer.innerHTML = '' if frameContainer
</script>

<div class="flex flex-col h-screen bg-ef-bg text-ef-text">
  <!-- tab bar -->
  <div class="flex gap-1 p-2 bg-ef-bg-deep items-center border-b border-ef-border min-h-[60px]">
    {#each tabs as tab (tab.id)}
      <div
        class="flex border-2 border-ef-text-dim rounded-lg overflow-hidden"
        in:fly={{ y: -24, duration: 200, opacity: 0 }}
        out:fly={{ x: -30, duration: 150, opacity: 0 }}
      >
        <button
          class="px-4 py-2 font-medium text-ef-text-dim"
          class:bg-ef-tab-active={openTab === tab.id}
          class:text-ef-text={openTab === tab.id}
          class:bg-ef-bg={openTab !== tab.id}
          onclick={() => toggle(tab.id)}
        >
          {#if tab.type === 'games'}
            <i class="fa-solid fa-gamepad mr-1.5"></i>
          {/if}
          {tab.label}
        </button>
        <button
          class="px-2 py-2 bg-ef-bg border-l-2 border-ef-text-dim text-ef-red font-bold leading-none hover:bg-ef-red hover:text-ef-bg"
          onclick={() => closeTab(tab.id)}
          aria-label="close tab"
        >×</button>
      </div>
    {/each}
    <button
      class="ml-auto px-3 py-2 bg-ef-bg border-2 border-ef-text-dim rounded-lg text-ef-text-dim font-medium leading-none hover:border-ef-accent hover:text-ef-accent"
      onclick={newTab}
    >+</button>
  </div>

  <Toolbar
    {currentUrl}
    {canGoBack}
    {canGoForward}
    onback={goBack}
    onforward={goForward}
    onreload={reload}
    onnavigate={navigateToolbar}
  />

  <!-- content area -->
  <div class="grow relative bg-cover bg-center" style="background-image: url('./bg.png')">

    <!-- games view -->
    {#if isGamesTab}
      <div class="absolute inset-0 flex flex-col z-10">
        {#if activeGame}
          <div class="flex items-center gap-3 p-2 bg-ef-bg-deep border-b border-ef-border shrink-0">
            <button
              class="px-3 py-1.5 bg-ef-bg border-2 border-ef-text-dim text-ef-text-dim rounded-lg hover:border-ef-accent hover:text-ef-accent font-medium text-sm"
              onclick={backFromGame}
            ><i class="fa-solid fa-arrow-left mr-1"></i>back</button>
          </div>
          <div class="grow relative">
            {#if gameLoading}
              <div class="absolute inset-0 flex items-center justify-center text-ef-accent text-3xl font-bold">loading...</div>
            {:else if gameUrl}
              <iframe src={gameUrl} title="game" class="w-full h-full border-none" allow="fullscreen"></iframe>
            {/if}
          </div>
        {:else}
          <div class="flex items-center gap-3 px-4 py-3 bg-ef-bg-deep border-b border-ef-border shrink-0">
            <h2 class="text-lg font-bold text-ef-accent"><i class="fa-solid fa-gamepad mr-2"></i>games</h2>
            <input
              type="text"
              bind:value={gamesSearch}
              oninput={() => gamesPage = 1}
              placeholder="search games..."
              class="ml-2 px-3 py-1.5 bg-ef-bg border-2 border-ef-text-dim rounded-lg text-ef-text placeholder-ef-text-muted outline-none focus:border-ef-accent text-sm w-56"
            />
            {#if totalPages > 1}
              <div class="ml-auto flex items-center gap-2 text-sm">
                <button
                  class="px-2 py-1 bg-ef-bg border-2 border-ef-text-dim rounded text-ef-text-dim hover:border-ef-accent hover:text-ef-accent disabled:opacity-40"
                  disabled={gamesPage <= 1}
                  onclick={() => gamesPage--}
                  aria-label="previous page"
                ><i class="fa-solid fa-chevron-left"></i></button>
                <span class="text-ef-text-muted">{gamesPage} / {totalPages}</span>
                <button
                  class="px-2 py-1 bg-ef-bg border-2 border-ef-text-dim rounded text-ef-text-dim hover:border-ef-accent hover:text-ef-accent disabled:opacity-40"
                  disabled={gamesPage >= totalPages}
                  onclick={() => gamesPage++}
                  aria-label="next page"
                ><i class="fa-solid fa-chevron-right"></i></button>
              </div>
            {/if}
          </div>
          <div class="grow overflow-y-auto p-4 bg-ef-bg/90">
            {#if gamesLoading}
              <div class="flex items-center justify-center h-full text-ef-accent text-3xl font-bold">loading...</div>
            {:else if gamesError}
              <div class="flex items-center justify-center h-full text-ef-red text-lg">{gamesError}</div>
            {:else}
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {#each pagedGames as game}
                  <button
                    use:svelteTilt={{ max: 10, perspective: 800, scale: 1.04, speed: 300, glare: true, "max-glare": 0.2 }}
                    class="flex flex-col rounded-xl overflow-hidden border-2 border-ef-text-dim hover:border-ef-accent bg-ef-bg-deep transition-colors text-left"
                    onclick={() => loadGame(game.id)}
                  >
                    {#if game.imgUrl}
                      <img src={game.imgUrl} alt={game.name} class="w-full aspect-video object-cover" />
                    {:else}
                      <div class="w-full aspect-video bg-ef-bg flex items-center justify-center text-ef-text-muted text-xs"><i class="fa-solid fa-image"></i></div>
                    {/if}
                    <div class="px-2 py-1.5 text-sm font-medium text-ef-text truncate">{game.name}</div>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    <!-- scramjet containe -->
    <div bind:this={frameContainer} class="absolute inset-0 bg-ef-bg" class:hidden={!activeTab?.content || isGamesTab}></div>
    {#if frameLoading && activeTab?.content && !isGamesTab}
      <div class="absolute inset-0 flex items-center justify-center bg-ef-bg text-ef-accent text-3xl font-bold pointer-events-none">loading...</div>
    {/if}

    <!-- new tab or no tabs -->
    {#if !isGamesTab && openTab === null}
      <div class="absolute inset-0 flex items-center justify-center">
        <div
          use:svelteTilt={{ max: 15, perspective: 1000, scale: 1.03, speed: 400, glare: true, "max-glare": 0.3 }}
          class="px-10 py-8 bg-ef-bg-deep border-2 border-ef-text-dim rounded-2xl shadow-2xl text-ef-text-muted text-xl font-medium"
        >
          no tab open
        </div>
      </div>
    {:else if !isGamesTab && !activeTab?.content}
      <div class="absolute inset-0 flex items-center justify-center">
        <div
          use:svelteTilt={{ max: 15, perspective: 1000, scale: 1.03, speed: 400, glare: true, "max-glare": 0.3 }}
          class="px-10 py-8 bg-ef-bg-deep border-2 border-ef-text-dim rounded-2xl shadow-2xl text-ef-text flex flex-col items-center gap-6"
        >
          <h1 class="text-5xl font-bold tracking-tight text-ef-accent">aspen</h1>
          <form onsubmit={(e) => { e.preventDefault(); submitSearch(); }} class="flex gap-2 w-80">
            <input
              type="text"
              bind:value={searchInput}
              placeholder="search or url"
              class="grow px-3 py-2 bg-ef-bg border-2 border-ef-text-dim rounded-lg text-ef-text placeholder-ef-text-muted outline-none focus:border-ef-accent"
            />
            <button
              type="submit"
              class="px-4 py-2 bg-ef-bg border-2 border-ef-accent text-ef-accent font-medium rounded-lg hover:bg-ef-accent hover:text-ef-bg"
            >go</button>
          </form>
          <button
            class="flex items-center gap-2 px-5 py-2.5 bg-ef-bg border-2 border-ef-text-dim text-ef-text-dim rounded-xl hover:border-ef-accent hover:text-ef-accent font-medium transition-colors"
            onclick={openGamesTab}
          >
            <i class="fa-solid fa-gamepad text-lg"></i>
            games
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
