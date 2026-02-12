<script>
let items = [];
let updateState = false;

function onConsider() {
    // Removed state update from here
    // Update that was here has been removed
}

function onFinalize() {
    // Items are now updated only in onFinalize
    updateState = true;
    // logic to update items
}
</script>

<template>
  <div>
    <h1>Bushing Sortable Lane</h1>
    <!-- additional template code here -->
  </div>
</template>
