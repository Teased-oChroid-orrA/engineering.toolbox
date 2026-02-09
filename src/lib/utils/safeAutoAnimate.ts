// Dev/runtime-safe wrapper for @formkit/auto-animate.
// WebKit (WKWebView / Safari) can throw internal DOM accessor errors like
// `next_sibling_getter.call` when nodes detach/reattach mid-frame.
// We disable auto-animate on WebKit to keep the app stable.
//
// Usage:
//   import { safeAutoAnimate, isWebKitRuntime } from '$lib/utils/safeAutoAnimate';
//   const ctrl = safeAutoAnimate(el, { duration: 160 });
//   // ctrl?.disable() on destroy if desired.

import autoAnimate from '@formkit/auto-animate';

export function isWebKitRuntime(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isAppleWebKit = /AppleWebKit\//.test(ua);
  const isChromium = /Chrome\//.test(ua) || /Chromium\//.test(ua);
  // Safari / WKWebView => AppleWebKit but not Chromium
  return isAppleWebKit && !isChromium;
}

export function safeAutoAnimate(
  el: Element | null | undefined,
  options?: any
): { enable: () => void; disable: () => void } | null {
  try {
    if (!el) return null;
    if (isWebKitRuntime()) return null;
    // Only animate connected nodes
    // @ts-ignore
    if (el instanceof HTMLElement && !el.isConnected) return null;
    // autoAnimate may throw in some edge cases; keep best-effort.
    // @ts-ignore
    return autoAnimate(el, options);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[auto-animate] disabled due to error', err);
    return null;
  }
}
