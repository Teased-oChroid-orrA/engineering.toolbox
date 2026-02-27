import * as d3 from 'd3';
import type { EnvelopePoint } from '$lib/core/weight-balance/types';
import { mapCGToDisplay } from '$lib/core/weight-balance/displayAdapters';

type LinearScale = d3.ScaleLinear<number, number>;

export function drawCurrentCG(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  currentCG: { weight: number; cgPosition: number },
  uncertaintyBand: { cgMin: number; cgMax: number } | undefined,
  envelopes: { vertices: EnvelopePoint[] }[],
  xScale: LinearScale,
  yScale: LinearScale,
  innerWidth: number,
  innerHeight: number,
  useMACDisplay: boolean,
  lemac?: number,
  mac?: number
): void {
  const displayCGPosition = mapCGToDisplay(currentCG.cgPosition, useMACDisplay, lemac, mac);
  const inEnvelope = envelopes.some((entry) =>
    isPointInPolygon(currentCG.cgPosition, currentCG.weight, entry.vertices)
  );
  const pointColor = inEnvelope ? '#22c55e' : '#ef4444';

  drawUncertaintyOverlay(
    g,
    currentCG.weight,
    uncertaintyBand,
    xScale,
    yScale,
    innerHeight,
    useMACDisplay,
    lemac,
    mac
  );
  drawCrosshairs(g, currentCG.weight, displayCGPosition, pointColor, xScale, yScale, innerWidth, innerHeight);
  drawCurrentPoint(g, currentCG.weight, displayCGPosition, pointColor, xScale, yScale, useMACDisplay, currentCG.cgPosition);
}

function drawCrosshairs(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  weight: number,
  displayCGPosition: number,
  pointColor: string,
  xScale: LinearScale,
  yScale: LinearScale,
  innerWidth: number,
  innerHeight: number
): void {
  g.append('line')
    .attr('x1', 0)
    .attr('x2', innerWidth)
    .attr('y1', yScale(weight))
    .attr('y2', yScale(weight))
    .attr('stroke', pointColor)
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,4')
    .attr('opacity', 0.5);
  g.append('line')
    .attr('x1', xScale(displayCGPosition))
    .attr('x2', xScale(displayCGPosition))
    .attr('y1', 0)
    .attr('y2', innerHeight)
    .attr('stroke', pointColor)
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '4,4')
    .attr('opacity', 0.5);
}

function drawCurrentPoint(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  weight: number,
  displayCGPosition: number,
  pointColor: string,
  xScale: LinearScale,
  yScale: LinearScale,
  useMACDisplay: boolean,
  rawCGPosition: number
): void {
  g.append('circle')
    .attr('cx', xScale(displayCGPosition))
    .attr('cy', yScale(weight))
    .attr('r', 6)
    .attr('fill', pointColor)
    .attr('stroke', '#fff')
    .attr('stroke-width', 2);
  const label = useMACDisplay
    ? `${weight.toFixed(0)} lbs @ ${displayCGPosition.toFixed(1)}% MAC`
    : `${weight.toFixed(0)} lbs @ ${rawCGPosition.toFixed(2)}"`;
  g.append('text')
    .attr('x', xScale(displayCGPosition) + 10)
    .attr('y', yScale(weight) - 10)
    .attr('fill', pointColor)
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .text(label);
}

function drawUncertaintyOverlay(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  weight: number,
  uncertaintyBand: { cgMin: number; cgMax: number } | undefined,
  xScale: LinearScale,
  yScale: LinearScale,
  innerHeight: number,
  useMACDisplay: boolean,
  lemac?: number,
  mac?: number
): void {
  if (!uncertaintyBand) return;
  if (!Number.isFinite(uncertaintyBand.cgMin) || !Number.isFinite(uncertaintyBand.cgMax)) return;
  if (uncertaintyBand.cgMax < uncertaintyBand.cgMin) return;

  const displayBandMin = mapCGToDisplay(uncertaintyBand.cgMin, useMACDisplay, lemac, mac);
  const displayBandMax = mapCGToDisplay(uncertaintyBand.cgMax, useMACDisplay, lemac, mac);
  const xBandMin = xScale(Math.min(displayBandMin, displayBandMax));
  const xBandMax = xScale(Math.max(displayBandMin, displayBandMax));
  const bandWidth = Math.max(1.5, xBandMax - xBandMin);
  const centerY = yScale(weight);

  g.append('rect')
    .attr('x', xBandMin)
    .attr('y', 0)
    .attr('width', bandWidth)
    .attr('height', innerHeight)
    .attr('fill', '#22d3ee')
    .attr('fill-opacity', 0.08)
    .attr('stroke', '#22d3ee')
    .attr('stroke-width', 1)
    .attr('stroke-opacity', 0.35)
    .attr('stroke-dasharray', '2,2');
  g.append('line')
    .attr('x1', xBandMin)
    .attr('x2', xBandMax)
    .attr('y1', centerY)
    .attr('y2', centerY)
    .attr('stroke', '#67e8f9')
    .attr('stroke-width', 2)
    .attr('stroke-opacity', 0.9);
  drawWhisker(g, xBandMin, centerY);
  drawWhisker(g, xBandMax, centerY);

  const bandLabel = useMACDisplay
    ? `CG uncertainty: ${displayBandMin.toFixed(1)}-${displayBandMax.toFixed(1)}%`
    : `CG uncertainty: ${uncertaintyBand.cgMin.toFixed(2)}"-${uncertaintyBand.cgMax.toFixed(2)}"`;
  g.append('text')
    .attr('x', xBandMin + bandWidth / 2)
    .attr('y', Math.max(12, centerY - 14))
    .attr('text-anchor', 'middle')
    .attr('fill', '#67e8f9')
    .attr('font-size', '10px')
    .attr('font-weight', 'bold')
    .text(bandLabel);
}

function drawWhisker(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  x: number,
  centerY: number
): void {
  const halfHeight = 10;
  g.append('line')
    .attr('x1', x)
    .attr('x2', x)
    .attr('y1', centerY - halfHeight)
    .attr('y2', centerY + halfHeight)
    .attr('stroke', '#67e8f9')
    .attr('stroke-width', 1.5)
    .attr('stroke-opacity', 0.9);
}

function isPointInPolygon(x: number, y: number, vertices: EnvelopePoint[]): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].cgPosition;
    const yi = vertices[i].weight;
    const xj = vertices[j].cgPosition;
    const yj = vertices[j].weight;
    const intersect = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
