<script lang="ts">
  import { cn } from '$lib/utils';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    input: string | number | null;
    change: string | number | null;
  }>();

  export let value: string | number | null = '';
  export let type = 'text';
  export let step: string | number | undefined = undefined;
  export let placeholder = '';
  export let disabled = false;
  export let readonly = false;
  let className: string | undefined | null = undefined;
  export { className as class };
  export let name: string | undefined = undefined;
  export let id: string | undefined = undefined;

  // --- Numeric entry robustness (WP1.5) ---
  // For type="number" we preserve a raw string while the user types so that
  // intermediate states like ".", "0.", or "-." don't get coerced into NaN/0.
  // We only parse+commit on blur or Enter.
  let raw = '';
  let isEditing = false;
  let isInvalid = false;

  function normalizeRawFromValue(v: string | number | null): string {
    if (v === null || v === undefined) return '';
    // Keep string as-is unless it's an empty string.
    if (typeof v === 'string') return v;
    return Number.isFinite(v) ? String(v) : '';
  }

  const VALID_NUMBER_RE = /^[-+]?((\d+(\.\d*)?)|(\.\d+))$/;

  // Keep raw in sync with external value when not actively editing.
  $: if (type === 'number' && !isEditing) {
    raw = normalizeRawFromValue(value);
    isInvalid = false;
  }

  // Default to 'any' for numbers to allow decimal inputs via arrow keys
  $: finalStep = type === 'number' && (step === undefined || step === null) ? 'any' : step;

  function commitNumber(nextRaw: string) {
    const trimmed = nextRaw.trim();
    if (trimmed === '') {
      value = null;
      isInvalid = false;
      dispatch('change', value);
      return;
    }

    if (!VALID_NUMBER_RE.test(trimmed)) {
      // Keep existing numeric value; user can correct the raw text.
      isInvalid = true;
      return;
    }

    const n = Number.parseFloat(trimmed);
    if (!Number.isFinite(n)) {
      isInvalid = true;
      return;
    }

    value = n;
    isInvalid = false;
    dispatch('change', value);
  }

  function onInput(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    if (type === 'number') {
      raw = el.value;
      // While typing we emit the raw value for consumers that care,
      // but we intentionally do NOT update the bound numeric value.
      dispatch('input', raw);
      return;
    }

    value = el.value;
    dispatch('input', value);
  }

  function onChange() {
    // For number inputs, browser change events can be inconsistent;
    // we commit on blur/Enter instead.
    if (type !== 'number') dispatch('change', value);
  }

  function onFocus() {
    isEditing = true;
  }

  function onBlur() {
    if (type === 'number') commitNumber(raw);
    isEditing = false;
  }

  function onKeydown(e: KeyboardEvent) {
    if (type !== 'number') return;
    if (e.key === 'Enter') {
      commitNumber(raw);
      // Allow Enter to behave like "commit" without submitting forms.
      (e.currentTarget as HTMLInputElement)?.blur();
    }
  }
</script>

{#if type === 'number'}
  <input
    {id}
    {name}
    {type}
    step={finalStep}
    {placeholder}
    {disabled}
    {readonly}
    aria-invalid={isInvalid ? 'true' : 'false'}
    class={cn(
      // "Glass Input" styling: Dark transparent background with white text
      'flex h-9 w-full rounded-md border border-white/10 bg-black/20 px-3 py-1 text-sm text-white shadow-sm transition-all',
      'placeholder:text-white/20',
      'focus-visible:border-indigo-500/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/50',
      isInvalid ? 'border-rose-400/60 ring-1 ring-rose-400/30' : '',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    bind:value={raw}
    on:input={onInput}
    on:change={onChange}
    on:focus={onFocus}
    on:blur={onBlur}
    on:keydown={onKeydown}
    {...$$restProps}
  />
{:else}
  <input
    {id}
    {name}
    {type}
    step={finalStep}
    {placeholder}
    {disabled}
    {readonly}
    aria-invalid={isInvalid ? 'true' : 'false'}
    class={cn(
      // "Glass Input" styling: Dark transparent background with white text
      'flex h-9 w-full rounded-md border border-white/10 bg-black/20 px-3 py-1 text-sm text-white shadow-sm transition-all',
      'placeholder:text-white/20',
      'focus-visible:border-indigo-500/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/50',
      isInvalid ? 'border-rose-400/60 ring-1 ring-rose-400/30' : '',
      'disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    bind:value={value}
    on:input={onInput}
    on:change={onChange}
    on:focus={onFocus}
    on:blur={onBlur}
    on:keydown={onKeydown}
    {...$$restProps}
  />
{/if}
