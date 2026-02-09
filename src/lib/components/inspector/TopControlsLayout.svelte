<script lang="ts">
  import { INSPECTOR_THEME, type TopControlSpanKey } from '$lib/components/inspector/InspectorThemeTokens';
  import { safeAutoAnimate, isWebKitRuntime } from '$lib/utils/safeAutoAnimate';

  let {
    spans = {},
    headersSnippet,
    targetSnippet,
    matchSnippet,
    scopeSnippet,
    querySnippet,
    optionsSnippet,
    maxScanSnippet
  } = $props<{
    spans?: Partial<Record<TopControlSpanKey, string>>;
    headersSnippet?: () => any;
    targetSnippet?: () => any;
    matchSnippet?: () => any;
    scopeSnippet?: () => any;
    querySnippet?: () => any;
    optionsSnippet?: () => any;
    maxScanSnippet?: () => any;
  }>();

  function aa(node: HTMLElement) {
    try {
      if (isWebKitRuntime()) return {} as any;
    } catch {
      if (isWebKitRuntime()) return {} as any;
    }
    const ctl = safeAutoAnimate(node, { duration: 170 });
    return {
      destroy() {
        try { (ctl as any)?.disable?.(); } catch {}
      }
    };
  }
</script>

<div class={INSPECTOR_THEME.topControls.grid} use:aa>
  <div class={spans.headers ?? INSPECTOR_THEME.topControls.spans.headers}>{@render headersSnippet?.()}</div>
  <div class={spans.target ?? INSPECTOR_THEME.topControls.spans.target}>{@render targetSnippet?.()}</div>
  <div class={spans.match ?? INSPECTOR_THEME.topControls.spans.match}>{@render matchSnippet?.()}</div>
  <div class={spans.scope ?? INSPECTOR_THEME.topControls.spans.scope}>{@render scopeSnippet?.()}</div>
  <div class={spans.query ?? INSPECTOR_THEME.topControls.spans.query}>{@render querySnippet?.()}</div>
  <div class={spans.options ?? INSPECTOR_THEME.topControls.spans.options}>{@render optionsSnippet?.()}</div>
  <div class={spans.maxScan ?? INSPECTOR_THEME.topControls.spans.maxScan}>{@render maxScanSnippet?.()}</div>
</div>
