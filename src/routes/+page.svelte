<script lang="civet">
  import { onMount } from 'svelte'
  import { search } from '$lib/search.js'
  import { registerSW } from '$lib/registerSW.js'
  import svelteTilt from 'vanilla-tilt-svelte'

  let tabs = $state([]) // tabs now get created

  let openTab = $state(null)
  let frameContainer: HTMLDivElement
  let scramjet: any
  let connection: any
  let swReady = false

  searchEngine := 'https://duckduckgo.com/?q=%s'

  onMount =>
    { ScramjetController } := (window as any).$scramjetLoadController()
    scramjet = new ScramjetController
      prefix: '/~/'
      files:
        wasm: '/static/wasm.wasm'
        all: '/static/all.js'
        sync: '/static/sync.js'
    scramjet.init()
    connection = new (window as any).BareMux.BareMuxConnection('/io/worker.js')

  loadProxy := async (rawUrl: string) =>
    if not swReady
      await registerSW()
      swReady = true

    url := search(rawUrl, searchEngine)
    wispUrl := localStorage.getItem('wispUrl')
    transportType := 'epoxy'
    localStorage.setItem('transport', transportType)

    transportPath := if transportType is 'epoxy' then '/net/index.mjs' else '/curl/index.mjs'
    transportConfig := if transportType is 'epoxy'
      [{ wisp: wispUrl }]
    else
      [{ websocket: wispUrl }]

    if (await connection.getTransport()) is not transportPath
      await connection.setTransport(transportPath, transportConfig)

    frameContainer.innerHTML = ''
    frame := scramjet.createFrame()
    frame.frame.style.width = '100%'
    frame.frame.style.height = '100%'
    frame.frame.style.border = 'none'
    frameContainer.appendChild(frame.frame)
    frame.go(url)

  toggle := (id: number) =>
    if openTab is id
      openTab = null
    else
      openTab = id
      tab := tabs.find (t) => t.id is id
      if tab?.content and frameContainer
        loadProxy(tab.content)
      else if frameContainer
        frameContainer.innerHTML = ''
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
    id := (Math.max(0, ...tabs.map (t) => t.id)) + 1
    tabs.push { id, label: 'new tab', content: null }
    openTab = id
    frameContainer.innerHTML = '' if frameContainer

  submitSearch := =>
    raw := searchInput.trim()
    return unless raw
    url := if linkRegex.test(raw) then raw else `${searxUrl}${encodeURIComponent(raw)}`
    if openTab is null
      id := (Math.max(0, ...tabs.map (t) => t.id)) + 1
      tabs.push { id, label: labelFor(url), content: url }
      openTab = id
    else
      tab := tabs.find (t) => t.id is openTab
      if tab
        tab.content = url
        tab.label = labelFor url
    loadProxy(url) if frameContainer
    searchInput = ''

  closeTab := (id: number) =>
    tabs = tabs.filter (t) => t.id is not id
    if openTab is id
      openTab = null
      frameContainer.innerHTML = '' if frameContainer
</script>

<div class="flex flex-col h-screen bg-ef-bg text-ef-text">
  <div class="flex gap-1 p-2 bg-ef-bg-deep items-center border-b border-ef-border min-h-[60px]">
    {#each tabs as tab}
      <div class="flex border-2 border-ef-text-dim rounded-lg overflow-hidden">
        <button
          class="px-4 py-2 font-medium text-ef-text-dim"
          class:bg-ef-tab-active={openTab === tab.id}
          class:text-ef-text={openTab === tab.id}
          class:bg-ef-bg={openTab !== tab.id}
          onclick={() => toggle(tab.id)}
        >
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
      class="ml-auto px-3 py-2 bg-ef-bg border-2 border-ef-green rounded-lg text-ef-accent font-medium leading-none hover:bg-ef-green hover:text-ef-bg"
      onclick={newTab}
    >+</button>
  </div>

  <div class="grow relative bg-cover bg-center" style="background-image: url('/bg.png')">
    <div class="absolute inset-0 flex items-center justify-center text-ef-accent text-3xl font-bold">loading...</div>
    <div bind:this={frameContainer} class="absolute inset-0 bg-ef-bg" class:hidden={!activeTab?.content}></div>
    {#if openTab === null}
      <div class="absolute inset-0 flex items-center justify-center">
        <div
          use:svelteTilt={{ max: 15, perspective: 1000, scale: 1.03, speed: 400, glare: true, "max-glare": 0.3 }}
          class="px-10 py-8 bg-ef-bg-deep border-2 border-ef-text-dim rounded-2xl shadow-2xl text-ef-text-muted text-xl font-medium"
        >
          no tab open
        </div>
      </div>
    {:else if !activeTab?.content}
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
        </div>
      </div>
    {/if}
  </div>
</div>
