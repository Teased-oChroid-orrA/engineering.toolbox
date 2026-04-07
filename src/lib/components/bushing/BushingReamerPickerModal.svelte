<script lang="ts">
  import { Input } from '$lib/components/ui';
  import {
    createCustomReamerCatalogEntry,
    describeReamerEntryForDisplay,
    type ReamerCatalogEntry
  } from '$lib/core/bushing/reamerCatalog';
  import type { BushingInputs } from '$lib/core/bushing';

  let {
    open = false,
    target = 'bore',
    units = 'imperial',
    entries = [],
    activeEntry = null,
    hasCustomCatalog = false,
    onClose = () => {},
    onSelectEntry = (_entry: ReamerCatalogEntry) => {},
    onApplyCustom = (_entry: ReamerCatalogEntry) => {},
    onDeleteEntry = (_entryId: string) => {}
  }: {
    open?: boolean;
    target?: 'bore' | 'id';
    units?: BushingInputs['units'];
    entries?: ReamerCatalogEntry[];
    activeEntry?: ReamerCatalogEntry | null;
    hasCustomCatalog?: boolean;
    onClose?: () => void;
    onSelectEntry?: (entry: ReamerCatalogEntry) => void;
    onApplyCustom?: (entry: ReamerCatalogEntry) => void;
    onDeleteEntry?: (entryId: string) => void;
  } = $props();

  let search = $state('');
  let mode = $state<'catalog' | 'custom'>('catalog');
  let customLabel = $state('');
  let customNominal = $state<number | null>(null);
  let customTolerancePlus = $state<number | null>(0);
  let customToleranceMinus = $state<number | null>(0);
  let customNotes = $state('');
  let validationError = $state<string | null>(null);

  const unitLabel = $derived(units === 'metric' ? 'mm' : 'in');
  const helperText = $derived(
    target === 'bore'
      ? 'Selecting a reamer here locks the bore definition to a tooling-driven band.'
      : 'Selecting a reamer here sets the ID from tooling intent while leaving the bore solver behavior unchanged.'
  );
  const titleText = $derived(target === 'bore' ? 'Select Bore Reamer' : 'Select ID Reamer');

  let filteredEntries = $derived.by(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => {
      const haystack = [
        entry.sizeLabel,
        entry.availabilityTier,
        entry.sourceFamily,
        entry.notes,
        entry.nominalIn.toFixed(4)
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  });
  let preferredEntries = $derived(filteredEntries.filter((entry) => entry.availabilityTier === 'preferred'));
  let commonEntries = $derived(filteredEntries.filter((entry) => entry.availabilityTier === 'common'));
  let specialEntries = $derived(filteredEntries.filter((entry) => entry.availabilityTier === 'special'));
  const catalogSections = $derived([
    { label: 'Preferred Aircraft Sizes', tone: 'preferred', entries: preferredEntries },
    { label: 'Common Stocked Sizes', tone: 'common', entries: commonEntries },
    { label: 'Special / Custom Catalog', tone: 'special', entries: specialEntries }
  ]);

  $effect(() => {
    if (!open) return;
    search = '';
    mode = 'catalog';
    validationError = null;
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });

  $effect(() => {
    if (!open) return;
    if (activeEntry && mode === 'custom' && customNominal === null) {
      customLabel = activeEntry.sizeLabel;
    }
  });

  function optionTestId(entry: ReamerCatalogEntry) {
    return `bushing-reamer-option-${entry.id.replace(/[^a-z0-9]+/gi, '-')}`;
  }

  function deleteTestId(entry: ReamerCatalogEntry) {
    return `bushing-reamer-delete-${entry.id.replace(/[^a-z0-9]+/gi, '-')}`;
  }

  function chooseEntry(entry: ReamerCatalogEntry) {
    onSelectEntry(entry);
    onClose();
  }

  function applyCustomSelection() {
    if (!Number.isFinite(customNominal) || Number(customNominal) <= 0) {
      validationError = `Enter a valid ${target.toUpperCase()} diameter.`;
      return;
    }
    if (!Number.isFinite(customTolerancePlus) || Number(customTolerancePlus) < 0) {
      validationError = 'Custom +Tol must be zero or greater.';
      return;
    }
    if (!Number.isFinite(customToleranceMinus) || Number(customToleranceMinus) < 0) {
      validationError = 'Custom -Tol must be zero or greater.';
      return;
    }
    validationError = null;
    const entry = createCustomReamerCatalogEntry(
      {
        sizeLabel: customLabel,
        nominal: Number(customNominal),
        tolerancePlus: Number(customTolerancePlus ?? 0),
        toleranceMinus: Number(customToleranceMinus ?? 0),
        notes: customNotes
      },
      units,
      target
    );
    onApplyCustom(entry);
    onClose();
  }

  function sectionTone(section: string) {
    if (section === 'preferred') return 'border-cyan-300/25 bg-cyan-500/10';
    if (section === 'common') return 'border-white/10 bg-white/[0.04]';
    return 'border-amber-300/20 bg-amber-500/10';
  }

  function deleteEntry(entryId: string) {
    onDeleteEntry(entryId);
    if (activeEntry?.id === entryId) onClose();
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/78 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    tabindex="0"
    onclick={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}
    onkeydown={(event) => {
      if (event.key === 'Escape') onClose();
    }}
  >
    <div
      class="w-full max-w-[96rem] overflow-hidden rounded-[28px] border border-cyan-300/18 bg-[radial-gradient(circle_at_top_left,rgba(8,145,178,0.18),transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.98))] shadow-[0_28px_120px_rgba(15,23,42,0.55)]"
      data-testid="bushing-reamer-picker"
    >
      <div class="border-b border-white/8 px-6 py-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div class="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/70">Reamer Workflow</div>
            <div class="mt-1 text-2xl font-semibold text-white">{titleText}</div>
            <div class="mt-2 max-w-3xl text-sm text-white/68">{helperText}</div>
          </div>
          <button
            type="button"
            class="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs font-medium text-white/78 transition-colors hover:bg-white/10 hover:text-white"
            onclick={onClose}
          >
            Close
          </button>
        </div>
      </div>

      <div class="grid gap-0 xl:grid-cols-[minmax(0,1.9fr)_minmax(21rem,0.85fr)]">
        <div class="border-b border-white/8 p-5 lg:border-b-0 lg:border-r">
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              class={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${mode === 'catalog' ? 'bg-cyan-400 text-slate-950' : 'border border-white/12 bg-white/6 text-white/72 hover:bg-white/10'}`}
              onclick={() => (mode = 'catalog')}
            >
              Catalog
            </button>
            <button
              type="button"
              class={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition-colors ${mode === 'custom' ? 'bg-cyan-400 text-slate-950' : 'border border-white/12 bg-white/6 text-white/72 hover:bg-white/10'}`}
              data-testid="bushing-reamer-picker-custom-tab"
              onclick={() => (mode = 'custom')}
            >
              Custom Size
            </button>
            {#if activeEntry}
              <div class="ml-auto rounded-full border border-cyan-300/22 bg-cyan-500/10 px-3 py-1 text-[11px] text-cyan-100/90">
                Active: {activeEntry.sizeLabel}
              </div>
            {/if}
          </div>

          {#if mode === 'catalog'}
            <div class="mt-4 space-y-4">
              <div class="grid gap-3 sm:grid-cols-[1fr_auto]">
                <Input
                  type="text"
                  placeholder="Search fraction, decimal, tier, or notes"
                  bind:value={search}
                  data-testid="bushing-reamer-picker-search"
                />
                <div class="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-white/65">
                  {filteredEntries.length} shown
                  {#if hasCustomCatalog}
                    · custom CSV loaded
                  {/if}
                </div>
              </div>

              <div class="grid gap-4 xl:grid-cols-3">
                {#each catalogSections as section}
                  <section class={`min-h-[34rem] rounded-3xl border p-4 ${sectionTone(section.tone)}`}>
                    <div class="flex items-center justify-between gap-2">
                      <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">{section.label}</div>
                      <div class="text-[11px] text-white/45">{section.entries.length}</div>
                    </div>
                    <div class="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                      {#if section.entries.length}
                        {#each section.entries as entry (entry.id)}
                          <div
                            class={`group relative rounded-2xl border transition-colors ${
                              activeEntry?.id === entry.id
                                ? 'border-cyan-300/45 bg-cyan-500/14 text-cyan-100'
                                : 'border-white/10 bg-black/18 text-white/82 hover:border-white/22 hover:bg-white/[0.06]'
                            }`}
                          >
                            <button
                              type="button"
                              class="w-full rounded-2xl px-3 py-3 pr-14 text-left"
                              data-testid={optionTestId(entry)}
                              onclick={() => chooseEntry(entry)}
                            >
                              <div class="flex flex-wrap items-start justify-between gap-2">
                                <div class="min-w-0 flex-1">
                                  <div class="truncate text-base font-semibold text-white">{entry.sizeLabel}</div>
                                </div>
                                <div class="flex shrink-0 flex-wrap items-center justify-end gap-1 text-[10px] uppercase tracking-[0.18em]">
                                  <span class={`rounded-full px-2 py-1 ${
                                    entry.availabilityTier === 'preferred'
                                      ? 'bg-cyan-300/15 text-cyan-100'
                                      : entry.availabilityTier === 'special'
                                        ? 'bg-amber-300/15 text-amber-100'
                                        : 'bg-white/8 text-white/55'
                                  }`}>
                                    {entry.availabilityTier}
                                  </span>
                                  {#if entry.preferredRank}
                                    <span class="rounded-full bg-cyan-300/10 px-2 py-1 text-cyan-200/80">
                                      #{entry.preferredRank}
                                    </span>
                                  {/if}
                                </div>
                              </div>
                              <div class="mt-2 text-[12px] leading-5 text-white/65">
                                {describeReamerEntryForDisplay(entry, units)}
                              </div>
                              {#if entry.notes}
                                <div class="mt-2 text-[11px] leading-5 text-white/52">
                                  {entry.notes}
                                </div>
                              {/if}
                            </button>
                            {#if entry.source === 'custom'}
                              <button
                                type="button"
                                class="absolute right-3 top-3 rounded-full border border-rose-300/18 bg-rose-500/8 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-100 opacity-0 transition-opacity hover:bg-rose-500/18 group-hover:opacity-100 focus:opacity-100"
                                data-testid={deleteTestId(entry)}
                                onclick={() => deleteEntry(entry.id)}
                              >
                                Delete
                              </button>
                            {/if}
                          </div>
                        {/each}
                      {:else}
                        <div class="rounded-2xl border border-dashed border-white/14 bg-black/18 px-3 py-5 text-sm text-white/48">
                          No entries matched the current search.
                        </div>
                      {/if}
                    </div>
                  </section>
                {/each}
              </div>
            </div>
          {:else}
            <div class="mt-4 space-y-4 rounded-3xl border border-cyan-300/18 bg-black/18 p-4">
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="space-y-1">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Custom Label</div>
                  <Input type="text" bind:value={customLabel} placeholder={`Custom ${target.toUpperCase()} tooling`} />
                </div>
                <div class="space-y-1">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Nominal ({unitLabel})</div>
                  <Input type="number" step="0.0001" bind:value={customNominal} />
                </div>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="space-y-1">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">+Tol ({unitLabel})</div>
                  <Input type="number" min="0" step="0.0001" bind:value={customTolerancePlus} />
                </div>
                <div class="space-y-1">
                  <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">-Tol ({unitLabel})</div>
                  <Input type="number" min="0" step="0.0001" bind:value={customToleranceMinus} />
                </div>
              </div>
              <div class="space-y-1">
                <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Notes</div>
                <Input type="text" bind:value={customNotes} placeholder="Optional process note" />
              </div>
              {#if validationError}
                <div class="rounded-2xl border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/92">
                  {validationError}
                </div>
              {/if}
              <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-white/65">
                <div>
                  This adds the entry into the custom CSV catalog in size order and immediately applies it to the current {target.toUpperCase()} workflow.
                </div>
                <button
                  type="button"
                  class="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
                  data-testid="bushing-reamer-picker-apply-custom"
                  onclick={applyCustomSelection}
                >
                  Add to custom catalog
                </button>
              </div>
            </div>
          {/if}
        </div>

        <div class="p-5">
          <div class="rounded-3xl border border-white/8 bg-white/[0.04] p-4">
            <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100/72">Workflow Notes</div>
            <div class="mt-3 space-y-3 text-sm text-white/68">
              <div>
                `Preferred` entries are highlighted for fast aircraft workflow selection. `Common` entries stay visible for stocked alternates and repair cases.
              </div>
              <div>
                CSV import stays in Advanced Process Controls so your catalog library remains managed in one place, even though selection now happens where the diameter is actually defined.
              </div>
              <div>
                Bore selections set a tooling-defined tolerance band. ID selections set the internal diameter from tooling intent and keep the rest of the internal profile workflow intact.
              </div>
            </div>
          </div>

          <div class="mt-4 rounded-3xl border border-white/8 bg-black/18 p-4">
            <div class="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/58">Active Selection</div>
            {#if activeEntry}
              <div class="mt-3 rounded-2xl border border-cyan-300/18 bg-cyan-500/10 px-3 py-3 text-sm text-cyan-100/92">
                <div class="font-semibold text-white">{activeEntry.sizeLabel}</div>
                <div class="mt-1 text-cyan-100/80">{describeReamerEntryForDisplay(activeEntry, units)}</div>
              </div>
            {:else}
              <div class="mt-3 rounded-2xl border border-dashed border-white/14 bg-black/18 px-3 py-4 text-sm text-white/45">
                No active {target.toUpperCase()} reamer selection. Use `Manual` in the card if you want direct numeric entry instead.
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
