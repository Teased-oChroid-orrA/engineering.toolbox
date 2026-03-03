import { renderDraftingSheetSvg } from '$lib/drafting/core/render';
import { exportPdfFromHtml, exportSvg, exportSvgText } from '$lib/drafting/core/export';
import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
import { buildBushingDraftMeta, buildBushingReportHtml } from './BushingReportBuilder';

type ExportContext = {
  form: BushingInputs;
  results: BushingOutput;
  draftingView: unknown;
};

function ensureStandaloneSvgNamespaces(svgText: string): string {
  if (!/\sxmlns=/.test(svgText)) {
    svgText = svgText.replace(/^<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!/\sxmlns:xlink=/.test(svgText)) {
    svgText = svgText.replace(/^<svg\b/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
  }
  return svgText;
}

function getLiveBushingSvgText(): string | null {
  if (typeof document === 'undefined') return null;
  const liveSvg = document.querySelector('svg[data-bushing-export-root="true"]');
  if (!(liveSvg instanceof SVGSVGElement)) return null;
  const clone = liveSvg.cloneNode(true);
  if (!(clone instanceof SVGSVGElement)) return null;
  clone.style.transform = '';
  clone.style.transformOrigin = '';
  const serializer = new XMLSerializer();
  return ensureStandaloneSvgNamespaces(serializer.serializeToString(clone));
}

export function prepareBushingExportArtifacts(ctx: ExportContext): { svgText: string; html: string } {
  const svgText = renderDraftingSheetSvg('bushing', ctx.draftingView, buildBushingDraftMeta(ctx.form, ctx.results));
  const html = buildBushingReportHtml(svgText, ctx.form, ctx.results);
  return { svgText, html };
}

export async function exportBushingSvg(ctx: ExportContext): Promise<void> {
  const liveSvgText = getLiveBushingSvgText();
  if (liveSvgText) {
    const parserHost = document.createElement('div');
    parserHost.innerHTML = liveSvgText;
    const parsed = parserHost.querySelector('svg');
    if (parsed instanceof SVGSVGElement) {
      await exportSvg(parsed, 'bushing_drafting.svg');
      return;
    }
  }
  const { svgText } = prepareBushingExportArtifacts(ctx);
  await exportSvgText(svgText, 'bushing_drafting.svg');
}

export async function exportBushingPdf(ctx: ExportContext): Promise<void> {
  const liveSvgText = getLiveBushingSvgText();
  const html = liveSvgText
    ? buildBushingReportHtml(liveSvgText, ctx.form, ctx.results)
    : prepareBushingExportArtifacts(ctx).html;
  await exportPdfFromHtml(html, 'Structural Companion - Bushing Report');
}
