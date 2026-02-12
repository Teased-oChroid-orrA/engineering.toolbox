// Drafting export helpers
// NOTE: Must work in restricted environments (file://) and also inside Tauri.
// We intentionally avoid static/dynamic imports of @tauri-apps/* packages because Vite will
// try to resolve them even if the code path is never executed.

type SaveDialogOptions = {
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
};

function getGlobalTauri(): any | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as any).__TAURI__;
}

function ensureSvgNamespaces(svgText: string): string {
  // Ensure xmlns is present for standalone viewing.
  if (!/\sxmlns=/.test(svgText)) {
    svgText = svgText.replace(
      /^<svg\b/,
      '<svg xmlns="http://www.w3.org/2000/svg"'
    );
  }
  if (!/\sxmlns:xlink=/.test(svgText)) {
    svgText = svgText.replace(
      /^<svg\b/,
      '<svg xmlns:xlink="http://www.w3.org/1999/xlink"'
    );
  }
  return svgText;
}

function downloadText(filename: string, text: string, mime = 'image/svg+xml;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a tick before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

async function tryTauriSave(filename: string, svgText: string): Promise<boolean> {
  const tauri = getGlobalTauri();
  if (!tauri) return false;

  // Two possible shapes exist depending on Tauri version/config:
  // - window.__TAURI__.dialog.save / window.__TAURI__.fs.writeBinaryFile (v1 global)
  // - window.__TAURI__.plugin.* (v2 plugins) — not guaranteed here.
  const dialog = tauri.dialog;
  const fs = tauri.fs;

  if (!dialog?.save || !fs?.writeBinaryFile) return false;

  const opts: SaveDialogOptions = {
    defaultPath: filename,
    filters: [{ name: 'SVG', extensions: ['svg'] }],
  };

  const path = await dialog.save(opts);
  if (!path) return true; // user canceled; treat as handled.

  const bytes = new Uint8Array(new TextEncoder().encode(svgText));

  // Try common signatures.
  try {
    await fs.writeBinaryFile({ path, contents: bytes });
    return true;
  } catch (_) {
    // Some versions expect (path, contents)
    try {
      await fs.writeBinaryFile(path, bytes);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Export a raw SVG string (already assembled) to the user's filesystem.
 * Useful for deterministic, solver-authoritative drafting where the SVG is
 * generated in code rather than captured from the DOM.
 */
export async function exportSvgText(svgText: string, filename = 'drawing.svg') {
  if (typeof window === 'undefined') return;
  svgText = ensureSvgNamespaces(svgText);

  try {
    const handled = await tryTauriSave(filename, svgText);
    if (handled) return;
  } catch {
    // fall through
  }
  downloadText(filename, svgText);
}



function openPrintWindow(html: string, title: string): boolean {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  try { w.document.title = title; } catch {}
  setTimeout(() => {
    try { w.focus(); w.print(); } catch {}
  }, 150);
  return true;
}

function printWithHiddenIframe(html: string, title: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '1px';
  iframe.style.height = '1px';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    throw new Error('Print iframe unavailable.');
  }
  doc.open();
  doc.write(html);
  doc.close();
  try { doc.title = title; } catch {}
  const cleanup = () => {
    try { iframe.remove(); } catch {}
  };
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(cleanup, 500);
    }
  }, 150);
}

/**
 * Export a print-ready HTML report (typically containing a solver-generated SVG sheet).
 * Users can Print → Save as PDF. Works in browser and Tauri WebView.
 */
export async function exportPdfFromHtml(html: string, title = 'Structural Companion Report') {
  if (typeof window === 'undefined') return;
  if (openPrintWindow(html, title)) return;
  printWithHiddenIframe(html, title);
}

export async function exportSvg(svgEl: SVGElement, filename = 'drawing.svg') {
  if (typeof window === 'undefined') return;
  const serializer = new XMLSerializer();
  let svgText = serializer.serializeToString(svgEl);
  svgText = ensureSvgNamespaces(svgText);

  // Prefer Tauri native save if available, otherwise browser download.
  try {
    const handled = await tryTauriSave(filename, svgText);
    if (handled) return;
  } catch {
    // fall through to browser download
  }
  downloadText(filename, svgText);
}
