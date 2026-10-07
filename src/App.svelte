<script lang="civet">
  import { search } from '$lib/search.js'
  import { getProxy } from '$lib/proxy.js'
  import { getZones, getZoneHtml, writeZone } from '$lib/zones.js'
  import svelteTilt from 'vanilla-tilt-svelte'
  import Toolbar from '$lib/Toolbar.svelte'
  import bgSrc from '$lib/assets/bg.png'
  import { assetUrl } from '$lib/assetUrl.js'
  import { fly, fade, scale } from 'svelte/transition'
  import { flip } from 'svelte/animate'
  import { cubicOut, backOut } from 'svelte/easing'

  bg := assetUrl(bgSrc)

  let tabs = $state([])
  let openTab = $state(null)
  let frameContainer: HTMLDivElement
  let frameLoading = $state(false)

  // one iframe per tab, kept alive while the tab is open
  views := new Map<number, HTMLIFrameElement>()
  // scramjet frames for browser tabs
  frames := new Map<number, any>()

  // games
  let zones = $state([])
  let zonesLoading = $state(false)
  let zonesError = $state('')
  let gamesSearch = $state('')
  let gamesPage = $state(1)

  gamesPerPage := 40

  filteredZones := $derived(
    if gamesSearch.trim()
      zones.filter (z: any) => z.name.toLowerCase().includes(gamesSearch.trim().toLowerCase())
    else
      zones
  )

  pagedZones := $derived(do
    start := (gamesPage - 1) * gamesPerPage
    filteredZones.slice(start, start + gamesPerPage)
  )

  totalPages := $derived(Math.max(1, Math.ceil(filteredZones.length / gamesPerPage)))

  // per-tab history: Map<tabId, { stack: string[], idx: number }>
  let tabHistories = new Map<number, { stack: string[], idx: number }>()
  let currentUrl = $state('')
  let canGoBack = $state(false)
  let canGoForward = $state(false)

  searchEngine := 'https://duckduckgo.com/?q=%s'

  showFrame := (tabId: number | null) =>
    for [id, view] of views
      view.style.display = if id is tabId then '' else 'none'

  syncNav := (tabId: number) =>
    return unless tabId is openTab
    h := tabHistories.get(tabId)
    currentUrl = h?.stack[h.idx] ?? ''
    canGoBack = !!h and h.idx > 0
    canGoForward = !!h and h.idx < h.stack.length - 1

  // update history on in-page navigation
  onUrlChange := (tabId: number, url: string) =>
    h := tabHistories.get(tabId)
    return unless h
    if url isnt h.stack[h.idx]
      h.stack = h.stack.slice(0, h.idx + 1)
      h.stack.push(url)
      h.idx = h.stack.length - 1
    tab := tabs.find (t) => t.id is tabId
    tab.label = labelFor(url) if tab
    syncNav(tabId)

  loadProxy := async (rawUrl: string) =>
    tabId := openTab
    return if tabId is null
    url := search(rawUrl, searchEngine)

    // push to this tabs history
    h := tabHistories.get(tabId) ?? { stack: [], idx: -1 }
    h.stack = h.stack.slice(0, h.idx + 1)
    h.stack.push(url)
    h.idx = h.stack.length - 1
    tabHistories.set(tabId, h)
    syncNav(tabId)

    frameLoading = true
    { controller, UrlWatcherPlugin } := await getProxy()
    return unless tabs.some (t) => t.id is tabId

    // tab was a game before
    destroyView(tabId) if views.has(tabId) and not frames.has(tabId)

    frame .= frames.get(tabId)
    unless frame
      iframe := makeIframe(tabId)
      iframe.addEventListener 'load', =>
        frameLoading = false if openTab is tabId
      frame = controller.createFrame iframe,
        plugins: [new UrlWatcherPlugin (u: string) => onUrlChange(tabId, u)]
      frames.set(tabId, frame)
    showFrame(openTab)
    frame.go(url)

  makeIframe := (tabId: number) =>
    iframe := document.createElement('iframe')
    iframe.className = 'absolute inset-0 w-full h-full border-none'
    iframe.allow = 'fullscreen; autoplay; gamepad'
    frameContainer.appendChild(iframe)
    views.set(tabId, iframe)
    iframe

  destroyView := async (tabId: number) =>
    views.get(tabId)?.remove()
    views.delete(tabId)
    frame := frames.get(tabId)
    return unless frame
    frames.delete(tabId)
    { controller } := await getProxy()
    controller.frames = controller.frames.filter (f: any) => f isnt frame

  activeFrame := => if openTab is null then undefined else frames.get(openTab)

  goBack := =>
    return unless openTab is not null
    h := tabHistories.get(openTab)
    return unless h and h.idx > 0
    h.idx--
    syncNav(openTab)
    activeFrame()?.back()

  goForward := =>
    return unless openTab is not null
    h := tabHistories.get(openTab)
    return unless h and h.idx < h.stack.length - 1
    h.idx++
    syncNav(openTab)
    activeFrame()?.forward()

  reload := =>
    tab := tabs.find (t) => t.id is openTab
    if tab?.type is 'game'
      loadGame(tab.id, tab.zone)
    else
      activeFrame()?.reload()

  nextId := => (Math.max(0, ...tabs.map (t) => t.id)) + 1

  loadZones := async =>
    return if zones.length or zonesLoading
    zonesLoading = true
    zonesError = ''
    try
      zones = await getZones()
    catch e
      zonesError = String(e)
    zonesLoading = false

  openGamesTab := =>
    tab := tabs.find (t) => t.id is openTab
    if tab and not tab.content
      tab.type = 'games'
      tab.label = 'games'
    else
      id := nextId()
      tabs.push { id, label: 'games', content: null, type: 'games' }
      toggle(id)
    loadZones()

  // games get written straight into a fresh iframe, no proxy
  loadGame := async (tabId: number, zone: any) =>
    destroyView(tabId)
    frameLoading = true if openTab is tabId
    try
      html := await getZoneHtml(zone)
      return unless tabs.some (t) => t.id is tabId
      writeZone(makeIframe(tabId), html)
      showFrame(openTab)
    catch e
      tab := tabs.find (t) => t.id is tabId
      tab.label = 'failed to load' if tab
      console.error(e)
    frameLoading = false if openTab is tabId

  openGame := (zone: any) =>
    // some zones are just links
    if zone.external
      id := nextId()
      tabs.push { id, label: labelFor(zone.url), content: zone.url, type: 'browser' }
      toggle(id)
      loadProxy(zone.url)
      return
    id := nextId()
    tabs.push { id, label: zone.name.slice(0, 20), content: zone.name, type: 'game', zone }
    toggle(id)
    loadGame(id, zone)

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
    openTab = if openTab is id then null else id
    frameLoading = false
    showFrame(openTab)
    if openTab is null
      currentUrl = ''
      canGoBack = false
      canGoForward = false
    else
      syncNav(openTab)
  // regex from stack overflow
  linkRegex := /^(([a-z]+:\/\/)?(([a-z0-9\-]+\.)+([a-z]{2}|aero|arpa|biz|com|coop|edu|gov|info|int|jobs|mil|museum|name|nato|net|org|pro|travel|local|internal))(:[0-9]{1,5})?(\/[a-z0-9_\-\.~]+)*(\/([a-z0-9_\-\.]*)(\?[a-z0-9+_\-\.%=&]*)?)?(#[a-zA-Z0-9!$&'()*+.=\-_~:@\/?]*)?)$/i

  searxUrl := 'https://www.metacrawler.com/serp?q='

  let searchInput = $state('')

  activeTab := $derived(tabs.find (t) => t.id is openTab)

  labelFor := (raw: string) =>
    normalized := if /^https?:\/\//.test(raw) then raw else `https://${raw}`
    try
      host := new URL(normalized).hostname.replace(/^www\./, '')
      host.slice(0, 20) or 'new tab'
    catch
      raw.slice(0, 20) or 'new tab'

  newTab := =>
    id := nextId()
    tabs.push { id, label: 'new tab', content: null, type: 'browser' }
    toggle(id)

  submitSearch := =>
    raw := searchInput.trim()
    return unless raw
    url := if linkRegex.test(raw) then raw else `${searxUrl}${encodeURIComponent(raw)}`
    if openTab is null
      id := nextId()
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
    destroyView(id)
    tabs = tabs.filter (t) => t.id is not id
    if openTab is id
      openTab = null
      frameLoading = false
      currentUrl = ''
      canGoBack = false
      canGoForward = false
</script>

<div class="flex flex-col h-screen bg-ef-bg text-ef-text">
  <!-- tab bar -->
  <div class="flex gap-1 p-2 bg-ef-bg-deep items-center border-b border-ef-border min-h-[60px]">
    {#each tabs as tab (tab.id)}
      <div
        class="flex border-2 border-ef-text-dim rounded-lg overflow-hidden"
        animate:flip={{ duration: 200, easing: cubicOut }}
        in:fly={{ y: -24, duration: 200, opacity: 0 }}
        out:fly={{ x: -30, duration: 150, opacity: 0 }}
      >
        <button
          class="px-4 py-2 font-medium text-ef-text-dim transition-colors duration-200"
          class:bg-ef-tab-active={openTab === tab.id}
          class:text-ef-text={openTab === tab.id}
          class:bg-ef-bg={openTab !== tab.id}
          onclick={() => toggle(tab.id)}
        >
          {#if tab.type === 'games' || tab.type === 'game'}
            <i class="fa-solid fa-gamepad mr-1.5"></i>
          {/if}
          {tab.label}
        </button>
        <button
          class="px-2 py-2 bg-ef-bg border-l-2 border-ef-text-dim text-ef-red font-bold leading-none transition-colors duration-150 hover:bg-ef-red hover:text-ef-bg"
          onclick={() => closeTab(tab.id)}
          aria-label="close tab"
        >×</button>
      </div>
    {/each}
    <button
      class="ml-auto w-9 h-9 -translate-y-px flex items-center justify-center bg-ef-bg border-2 border-ef-text-dim rounded-lg text-ef-text-dim font-medium leading-none transition-all duration-150 hover:border-ef-accent hover:text-ef-accent hover:rotate-90 active:scale-90"
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
  <div class="grow relative bg-cover bg-center" style="background-image: url({bg})">

    <!-- scramjet containe -->
    <div bind:this={frameContainer} class="absolute inset-0 bg-ef-bg" class:hidden={!activeTab?.content}></div>
    {#if frameLoading && activeTab?.content}
      <div
        class="absolute inset-0 flex items-center justify-center bg-ef-bg text-ef-accent text-3xl font-bold pointer-events-none"
        transition:fade={{ duration: 150 }}
      ><span class="animate-pulse">loading...</span></div>
    {/if}

    <!-- games list -->
    {#if activeTab?.type === 'games'}
      <div class="absolute inset-0 flex flex-col z-10 bg-ef-bg" transition:fade={{ duration: 150 }}>
        <div class="flex items-center gap-3 px-4 py-3 bg-ef-bg-deep border-b border-ef-border shrink-0">
          <h2 class="text-lg font-bold text-ef-accent"><i class="fa-solid fa-gamepad mr-2"></i>games</h2>
          <input
            type="text"
            bind:value={gamesSearch}
            oninput={() => gamesPage = 1}
            placeholder="search games..."
            class="ml-2 px-3 py-1.5 bg-ef-bg border-2 border-ef-text-dim rounded-lg text-ef-text placeholder-ef-text-muted outline-none transition-colors duration-150 focus:border-ef-accent text-sm w-56"
          />
          <span class="text-sm text-ef-text-muted">{filteredZones.length}</span>
          {#if totalPages > 1}
            <div class="ml-auto flex items-center gap-2 text-sm">
              <button
                class="px-2 py-1 bg-ef-bg border-2 border-ef-text-dim rounded text-ef-text-dim transition-colors duration-150 hover:border-ef-accent hover:text-ef-accent disabled:opacity-40"
                disabled={gamesPage <= 1}
                onclick={() => gamesPage--}
                aria-label="previous page"
              ><i class="fa-solid fa-chevron-left"></i></button>
              <span class="text-ef-text-muted">{gamesPage} / {totalPages}</span>
              <button
                class="px-2 py-1 bg-ef-bg border-2 border-ef-text-dim rounded text-ef-text-dim transition-colors duration-150 hover:border-ef-accent hover:text-ef-accent disabled:opacity-40"
                disabled={gamesPage >= totalPages}
                onclick={() => gamesPage++}
                aria-label="next page"
              ><i class="fa-solid fa-chevron-right"></i></button>
            </div>
          {/if}
        </div>
        <div class="grow overflow-y-auto p-4">
          {#if zonesLoading}
            <div class="flex items-center justify-center h-full text-ef-accent text-3xl font-bold"><span class="animate-pulse">loading...</span></div>
          {:else if zonesError}
            <div class="flex flex-col items-center justify-center gap-3 h-full text-ef-red text-lg">
              {zonesError}
              <button
                class="px-4 py-2 bg-ef-bg border-2 border-ef-text-dim rounded-lg text-ef-text-dim text-base transition-colors duration-150 hover:border-ef-accent hover:text-ef-accent"
                onclick={loadZones}
              >retry</button>
            </div>
          {:else}
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {#each pagedZones as zone (zone.id)}
                <button
                  use:svelteTilt={{ max: 10, perspective: 800, scale: 1.04, speed: 300, glare: true, "max-glare": 0.2 }}
                  class="flex flex-col rounded-xl overflow-hidden border-2 border-ef-text-dim hover:border-ef-accent bg-ef-bg-deep transition-colors text-left"
                  onclick={() => openGame(zone)}
                >
                  <img src={zone.cover} alt={zone.name} loading="lazy" class="w-full aspect-video object-cover bg-ef-bg" />
                  <div class="px-2 py-1.5 text-sm font-medium text-ef-text truncate">{zone.name}</div>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- new tab or no tabs -->
    {#if openTab === null}
      <div
        class="absolute inset-0 flex items-center justify-center"
        in:scale={{ start: 0.9, duration: 250, easing: backOut }}
        out:fade={{ duration: 120 }}
      >
        <div
          use:svelteTilt={{ max: 15, perspective: 1000, scale: 1.03, speed: 400, glare: true, "max-glare": 0.3 }}
          class="px-10 py-8 bg-ef-bg-deep border-3 border-ef-text-dim rounded-2xl shadow-2xl text-ef-text-dim text-xl font-medium"
        >
          no tab open
        </div>
      </div>
    {:else if !activeTab?.content && activeTab?.type !== 'games'}
      <div
        class="absolute inset-0 flex items-center justify-center"
        in:scale={{ start: 0.9, duration: 250, easing: backOut }}
        out:fade={{ duration: 120 }}
      >
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
              class="grow px-3 py-2 bg-ef-bg border-2 border-ef-text-dim rounded-lg text-ef-text placeholder-ef-text-muted outline-none transition-colors duration-150 focus:border-ef-accent"
            />
            <button
              type="submit"
              class="px-4 py-2 bg-ef-bg border-2 border-ef-accent text-ef-accent font-medium rounded-lg transition-all duration-150 hover:bg-ef-accent hover:text-ef-bg active:scale-95"
            >go</button>
          </form>
          <button
            class="flex items-center gap-2 px-5 py-2.5 bg-ef-bg border-2 border-ef-text-dim text-ef-text-dim rounded-xl font-medium transition-all duration-150 hover:border-ef-accent hover:text-ef-accent active:scale-95"
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
