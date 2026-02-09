<script lang="ts">
  export let leftTitle = '';
  export let rightTitle = '';
</script>

<div class="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4 items-start">
  <div class="space-y-4">
    <slot name="left" />
  </div>

  <div class="space-y-4">
    <slot name="right" />
  </div>
</div>
