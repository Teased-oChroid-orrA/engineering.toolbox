import { renderDraftingSheetSvg } from '$lib/drafting/core/render';
import { exportPdfFromHtml, exportSvg, exportSvgText } from '$lib/drafting/core/export';
import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
import { buildBushingAuditBundle, buildBushingDraftMeta, buildBushingReportHtml } from './BushingReportBuilder';
import type { ReamerCatalogEntry } from '$lib/core/bushing/reamerCatalog';

type ExportContext = {
  form: BushingInputs;
  results: BushingOutput;
  draftingView: unknown;
  selectedReamer?: ReamerCatalogEntry | null;
  selectedIdReamer?: ReamerCatalogEntry | null;
  compareCases?: Array<{
    id: string;
    name: string;
    results: BushingOutput;
    deltaMargin: number;
    deltaInstallForce: number;
    deltaContactPressure: number;
  }>;
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
  const html = buildBushingReportHtml(svgText, ctx.form, ctx.results, undefined, {
    selectedReamer: ctx.selectedReamer,
    selectedIdReamer: ctx.selectedIdReamer,
    compareCases: ctx.compareCases
  });
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
    ? buildBushingReportHtml(liveSvgText, ctx.form, ctx.results, undefined, {
        selectedReamer: ctx.selectedReamer,
        selectedIdReamer: ctx.selectedIdReamer,
        compareCases: ctx.compareCases
      })
    : prepareBushingExportArtifacts(ctx).html;
  await exportPdfFromHtml(html, 'Structural Companion - Bushing Report');
}

export async function exportBushingJson(ctx: ExportContext): Promise<void> {
  const bundle = buildBushingAuditBundle(ctx.form, ctx.results, {
    selectedReamer: ctx.selectedReamer,
    selectedIdReamer: ctx.selectedIdReamer,
    compareCases: ctx.compareCases
  });
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'bushing_audit_bundle.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
