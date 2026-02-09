<script lang="ts">
  import { createTabs } from './tabs';
  export let value: string;
  createTabs(value);
</script>

<div class="w-full">
  <slot />
</div>
