<script>
  const tabs = [
    { id: 1, label: 'tab', content: 'tab' }, // add iframes somehow later
    { id: 2, label: 'tab', content: 'tab' }, // add iframes somehow later
    { id: 3, label: 'tab', content: 'tab' }, // add iframes somehow later
  ];

  let openTab = $state(null);

  function toggle(id) {
    if (openTab === id) {
      openTab = null; // dont switch tabs if current tab = tab id
    } else {
      openTab = id; // switch, mayb animate later
    }
  }
</script>

<div class="flex flex-col h-screen bg-ef-bg text-ef-text">
  <div class="flex gap-1 p-2 bg-ef-bg-deep items-center border-b border-ef-border">
    {#each tabs as tab}
      <button
        class="px-4 py-2 border border-ef-border font-medium text-ef-text-dim"
        class:bg-ef-tab-active={openTab === tab.id}
        class:text-ef-text={openTab === tab.id}
        class:bg-ef-bg={openTab !== tab.id}
        onclick={() => toggle(tab.id)}
      >
        {tab.label}
      </button>
    {/each}
    <button
      class="ml-auto px-3 py-2 bg-ef-bg border border-ef-border text-ef-text font-medium leading-none hover:bg-ef-tab-active"
      onclick={() => {console.log("tab created")}}
    >+</button>
  </div>

  <div class="bg-ef-bg grow p-4">
    {#if openTab !== null}
      {@const activeTab = tabs.find(t => t.id === openTab)}
      {#if activeTab}
        <p class="text-ef-text">{activeTab.content}</p>
      {/if}
    {:else}
      <p class="text-ef-text-muted">no tab open</p>
    {/if}
  </div>
</div>
