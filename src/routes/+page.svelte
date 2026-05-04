<script lang="civet">
  import { onMount } from 'svelte'
  import { search } from '$lib/search.js'
  import { registerSW } from '$lib/registerSW.js'

  tabs := [
    { id: 1, label: 'ddg', content: 'https://duckduckgo.com' }
    { id: 2, label: 'wiki', content: 'https://wikipedia.org' }
    { id: 3, label: 'example', content: 'https://example.com' }
  ]

  let openTab = $state(null)
  let frameContainer: HTMLDivElement
  let scramjet: any
  let connection: any
  let swReady = false

  searchEngine := 'https://duckduckgo.com/?q=%s'

  onMount =>
    { ScramjetController } := (window as any).$scramjetLoadController()
    scramjet = new ScramjetController
      files:
        wasm: '/scram/scramjet.wasm.wasm'
        all: '/scram/scramjet.all.js'
        sync: '/scram/scramjet.sync.js'
    scramjet.init()
    connection = new (window as any).BareMux.BareMuxConnection('/baremux/worker.js')

  loadProxy := async (rawUrl: string) =>
    if not swReady
      await registerSW()
      swReady = true

    url := search(rawUrl, searchEngine)
    wispUrl := localStorage.getItem('wispUrl')
    transportType := 'epoxy'
    localStorage.setItem('transport', transportType)

    transportPath := if transportType is 'epoxy' then '/epoxy/index.mjs' else '/libcurl/index.mjs'
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
      if tab and frameContainer
        loadProxy(tab.content)
</script>

<div class="flex flex-col h-screen text-ef-text relative">
  <div class="flex gap-1 p-2 items-center border-b border-ef-border">
    {#each tabs as tab}
      <button
        class="px-4 py-2 border-2 border-ef-text-dim font-medium text-ef-text-dim"
        class:bg-ef-tab-active={openTab === tab.id}
        class:text-ef-text={openTab === tab.id}
        class:bg-ef-bg={openTab !== tab.id}
        onclick={() => toggle(tab.id)}
      >
        {tab.label}
      </button>
    {/each}
    <button
      class="ml-auto px-3 py-2 bg-ef-bg border-2 border-ef-text-dim text-ef-text font-medium leading-none hover:bg-ef-tab-active"
      onclick={() => {console.log("tab created")}}
    >+</button>
  </div>

  <div class="grow relative">
    <div bind:this={frameContainer} class="absolute inset-0" class:hidden={openTab === null}></div>
    {#if openTab === null}
      <p class="text-ef-text-muted p-4">no tab open</p>
    {/if}
  </div>
</div>
