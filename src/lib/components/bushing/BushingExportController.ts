import { renderDraftingSheetSvg } from '$lib/drafting/core/render';
import { exportPdfFromHtml, exportSvgText } from '$lib/drafting/core/export';
import type { BushingInputs, BushingOutput } from '$lib/core/bushing';
import { buildBushingDraftMeta, buildBushingReportHtml } from './BushingReportBuilder';

type ExportContext = {
  form: BushingInputs;
  results: BushingOutput;
  draftingView: unknown;
};

export function prepareBushingExportArtifacts(ctx: ExportContext): { svgText: string; html: string } {
  const svgText = renderDraftingSheetSvg('bushing', ctx.draftingView, buildBushingDraftMeta(ctx.form, ctx.results));
  const html = buildBushingReportHtml(svgText, ctx.form, ctx.results);
  return { svgText, html };
}

export async function exportBushingSvg(ctx: ExportContext): Promise<void> {
  const { svgText } = prepareBushingExportArtifacts(ctx);
  await exportSvgText(svgText, 'bushing_drafting.svg');
}

export async function exportBushingPdf(ctx: ExportContext): Promise<void> {
  const { html } = prepareBushingExportArtifacts(ctx);
  await exportPdfFromHtml(html, 'Structural Companion - Bushing Report');
}
