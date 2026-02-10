<script lang="ts">
  // Runes mode: props via $props()
  let {
    onLoadFile,
    onExportCSV,
    onExportSTEP,
    onOpenSettings,
    onOpenDatums,
    onOpenDrafting,
    onOpenCreateGeometry,
    onOpenSurfaceCurveOps,
    onOpenExtrude,
    onOpenHealing,
    // Optional: gate STEP export until implemented.
    canExportSTEP = false,
    // Bindable notice string (parent owns it)
    fileNotice = $bindable(null as string | null)
  } = $props<{
    onLoadFile: (file: File) => void | Promise<void>;
    onExportCSV: () => void;
    onExportSTEP: () => void;
    onOpenSettings: () => void;
    onOpenDatums: () => void;
    onOpenDrafting: () => void;
    onOpenCreateGeometry: () => void;
    onOpenSurfaceCurveOps: () => void;
    onOpenExtrude: () => void;
    onOpenHealing: () => void;
    canExportSTEP?: boolean;
    fileNotice?: string | null;
  }>();

  let fileMenuOpen = $state(false);
  let fileSubOpen = $state(null as null | 'load' | 'export' | 'modeling');
  let fileInputEl: HTMLInputElement | null = null;

  function triggerFileLoad() {
    fileInputEl?.click();
  }

  async function handlePickedFile(f: File) {
    try {
      await onLoadFile(f);
    } finally {
      // Always close the menu after a load attempt
      fileMenuOpen = false;
      fileSubOpen = null;
    }
  }
</script>
<div class="relative">
  <button
    class="btn variant-soft"
    title="File"
    onclick={() => {
      fileMenuOpen = !fileMenuOpen;
      if (!fileMenuOpen) fileSubOpen = null;
    }}
  >
    File ▾
  </button>

  {#if fileMenuOpen}
    <div class="absolute right-0 mt-2 w-44 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg p-1 z-[200]">
      <button
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm flex items-center justify-between"
        onclick={() => (fileSubOpen = fileSubOpen === 'load' ? null : 'load')}
      >
        <span>Load</span><span class="text-white/40">›</span>
      </button>
      <button
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm flex items-center justify-between"
        onclick={() => (fileSubOpen = fileSubOpen === 'export' ? null : 'export')}
      >
        <span>Export</span><span class="text-white/40">›</span>
      </button>
      <button
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm flex items-center justify-between"
        onclick={() => (fileSubOpen = fileSubOpen === 'modeling' ? null : 'modeling')}
      >
        <span>Modeling</span><span class="text-white/40">›</span>
      </button>
      <button
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm"
        onclick={() => {
          fileNotice = null;
          onOpenDatums();
          fileMenuOpen = false;
          fileSubOpen = null;
        }}
      >
        Datums
      </button>
      <button
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm"
        onclick={() => {
          fileNotice = null;
          onOpenDrafting();
          fileMenuOpen = false;
          fileSubOpen = null;
        }}
      >
        Create Geometry
      </button>
      <button
        class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm"
        onclick={() => {
          fileNotice = null;
          onOpenSettings();
          fileMenuOpen = false;
          fileSubOpen = null;
        }}
      >
        Settings
      </button>

      {#if fileNotice}
        <div class="mt-1 px-3 py-2 text-[11px] text-amber-200/80">
          {fileNotice}
        </div>
      {/if}

      {#if fileSubOpen === 'load'}
        <div class="absolute top-0 right-full mr-2 w-48 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg p-1">
          <button
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm"
            onclick={() => {
              fileNotice = null;
              triggerFileLoad();
            }}
          >
            CSV (.csv)
          </button>
          <button
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm"
            onclick={() => {
              fileNotice = null;
              triggerFileLoad();
            }}
          >
            STEP (.stp/.step)
          </button>
        </div>
      {/if}

      {#if fileSubOpen === 'export'}
        <div class="absolute top-0 right-full mr-2 w-48 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg p-1">
          <button
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm"
            onclick={() => {
              fileNotice = null;
              onExportCSV();
              fileMenuOpen = false;
              fileSubOpen = null;
            }}
          >
            CSV (.csv)
          </button>
          <button
            class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm"
            onclick={() => {
              fileNotice = null;
              if (canExportSTEP) {
                onExportSTEP();
                fileMenuOpen = false;
                fileSubOpen = null;
              }
            }}
            disabled={!canExportSTEP}
          >
            STEP (.stp/.step) {#if !canExportSTEP}<span class="text-white/40">(coming soon)</span>{/if}
          </button>
        </div>
      {/if}

      {#if fileSubOpen === 'modeling'}
        <div class="absolute top-0 right-full mr-2 w-56 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg p-1">
          <button class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm" onclick={() => { onOpenCreateGeometry(); fileMenuOpen = false; fileSubOpen = null; }}>Create Geometry...</button>
          <button class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm" onclick={() => { onOpenSurfaceCurveOps(); fileMenuOpen = false; fileSubOpen = null; }}>Surface/Curve Operations...</button>
          <button class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm" onclick={() => { onOpenExtrude(); fileMenuOpen = false; fileSubOpen = null; }}>Extrude...</button>
          <button class="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm" onclick={() => { onOpenHealing(); fileMenuOpen = false; fileSubOpen = null; }}>Topology Healing...</button>
        </div>
      {/if}
    </div>
  {/if}

  <input
    bind:this={fileInputEl}
    type="file"
    accept=".csv,.stp,.step"
    class="hidden"
    onchange={(e) => {
      const el = e.currentTarget as HTMLInputElement;
      const f = el.files?.[0];
      if (!f) return;
      handlePickedFile(f);
      el.value = '';
    }}
  />
</div>
