<script lang="ts">
  import { Input, Label } from '$lib/components/ui';

  export let label = '';
  export let labelClass = 'text-white/70';
  export let value: number | null = null;
  export let step: number | string = 0.001;
  export let disabled = false;
  export let blocked = false;
</script>

<div class="space-y-1">
  <Label class={labelClass}>{label}</Label>
  <div class="relative">
    <Input type="number" {step} bind:value {disabled} />
    {#if disabled}
      <span
        class="pointer-events-none absolute inset-y-0 right-2 flex items-center text-white/45"
        title={blocked ? 'Not allowed for this profile mode.' : 'Calculated from the current countersink mode.'}>
        <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="9" />
          <line x1="5" y1="19" x2="19" y2="5" />
        </svg>
      </span>
    {/if}
  </div>
</div>
