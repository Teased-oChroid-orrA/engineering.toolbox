<script lang="ts">
  let { children } = $props<{ children?: () => any }>();

  function portal(node: HTMLElement) {
    const parent = node.parentElement;
    const next = node.nextSibling;
    document.body.appendChild(node);
    return {
      destroy() {
        if (!parent) return;
        if (next && next.parentNode === parent) parent.insertBefore(node, next);
        else parent.appendChild(node);
      }
    };
  }
</script>

<div use:portal>
  {@render children?.()}
</div>

