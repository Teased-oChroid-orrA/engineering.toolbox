import * as d3 from 'd3';
import type { CGEnvelope, EnvelopePoint } from '$lib/core/weight-balance/types';
import { formatPercentMAC } from '$lib/core/weight-balance/mac';

type DisplayEnvelope = CGEnvelope & {
  forwardLimit?: number;
  aftLimit?: number;
};

type LinearScale = d3.ScaleLinear<number, number>;

export function drawGridAndAxes(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  xScale: LinearScale,
  yScale: LinearScale,
  innerWidth: number,
  innerHeight: number,
  useMACDisplay: boolean,
  lemac?: number,
  mac?: number
): void {
  const xAxis = d3.axisBottom(xScale).ticks(10);
  if (useMACDisplay && lemac !== undefined && mac !== undefined && mac > 0) {
    xAxis.tickFormat((d) => formatPercentMAC(d as number, 0).replace(' MAC', ''));
  }
  const yAxis = d3.axisLeft(yScale).ticks(10);

  g.append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(xAxis)
    .call((axis) => axis.select('.domain').remove())
    .call((axis) => axis.selectAll('.tick line').clone().attr('y2', -innerHeight).attr('stroke', '#334155').attr('stroke-opacity', 0.3))
    .call((axis) => axis.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '11px'));

  g.append('g')
    .attr('class', 'grid')
    .call(yAxis)
    .call((axis) => axis.select('.domain').remove())
    .call((axis) => axis.selectAll('.tick line').clone().attr('x2', innerWidth).attr('stroke', '#334155').attr('stroke-opacity', 0.3))
    .call((axis) => axis.selectAll('.tick text').attr('fill', '#94a3b8').attr('font-size', '11px'));
}

export function drawEnvelopes(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  envelopes: DisplayEnvelope[],
  xScale: LinearScale,
  yScale: LinearScale,
  innerWidth: number,
  useMACDisplay: boolean
): void {
  const categoryColors: Record<string, string> = { normal: '#22c55e', utility: '#eab308', acrobatic: '#ef4444' };

  envelopes.forEach((envelope) => {
    const color = categoryColors[envelope.category] || '#64748b';
    drawEnvelopePolygon(g, envelope.vertices, color, xScale, yScale);
    drawLimitLines(g, envelope, color, xScale, yScale, innerWidth, useMACDisplay);
    drawEnvelopeLabel(g, envelope.vertices, envelope.category, color, xScale, yScale);
  });
}

function drawEnvelopePolygon(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  vertices: EnvelopePoint[],
  color: string,
  xScale: LinearScale,
  yScale: LinearScale
): void {
  const line = d3.line<EnvelopePoint>().x((d) => xScale(d.cgPosition)).y((d) => yScale(d.weight)).curve(d3.curveLinear);
  g.append('path')
    .datum([...vertices, vertices[0]])
    .attr('d', line)
    .attr('fill', color)
    .attr('fill-opacity', 0.1)
    .attr('stroke', color)
    .attr('stroke-width', 2)
    .attr('stroke-opacity', 0.8);
}

function drawLimitLines(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  envelope: DisplayEnvelope,
  color: string,
  xScale: LinearScale,
  yScale: LinearScale,
  innerWidth: number,
  useMACDisplay: boolean
): void {
  const unit = useMACDisplay ? '%' : '"';
  drawVerticalLimit(g, envelope.forwardLimit, color, xScale, yScale, `Fwd: ${envelope.forwardLimit?.toFixed(1)}${unit}`);
  drawVerticalLimit(g, envelope.aftLimit, color, xScale, yScale, `Aft: ${envelope.aftLimit?.toFixed(1)}${unit}`);

  if (!envelope.maxWeight) return;
  g.append('line')
    .attr('x1', 0)
    .attr('y1', yScale(envelope.maxWeight))
    .attr('x2', innerWidth)
    .attr('y2', yScale(envelope.maxWeight))
    .attr('stroke', color)
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '5,5')
    .attr('stroke-opacity', 0.6);
  g.append('text')
    .attr('x', innerWidth - 5)
    .attr('y', yScale(envelope.maxWeight) - 5)
    .attr('text-anchor', 'end')
    .attr('fill', color)
    .attr('font-size', '10px')
    .text(`Max: ${envelope.maxWeight.toFixed(0)} lbs`);
}

function drawVerticalLimit(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  limit: number | undefined,
  color: string,
  xScale: LinearScale,
  yScale: LinearScale,
  label: string
): void {
  if (limit === undefined || limit === null) return;
  g.append('line')
    .attr('x1', xScale(limit))
    .attr('y1', 0)
    .attr('x2', xScale(limit))
    .attr('y2', yScale.range()[0])
    .attr('stroke', color)
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '5,5')
    .attr('stroke-opacity', 0.6);
  g.append('text')
    .attr('x', xScale(limit))
    .attr('y', -5)
    .attr('text-anchor', 'middle')
    .attr('fill', color)
    .attr('font-size', '10px')
    .text(label);
}

function drawEnvelopeLabel(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  vertices: EnvelopePoint[],
  category: string,
  color: string,
  xScale: LinearScale,
  yScale: LinearScale
): void {
  const centroid = vertices.reduce(
    (acc, vertex) => ({
      cgPosition: acc.cgPosition + vertex.cgPosition / vertices.length,
      weight: acc.weight + vertex.weight / vertices.length
    }),
    { cgPosition: 0, weight: 0 }
  );
  g.append('text')
    .attr('x', xScale(centroid.cgPosition))
    .attr('y', yScale(centroid.weight))
    .attr('text-anchor', 'middle')
    .attr('fill', color)
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .text(category.toUpperCase());
}

export function drawAxisLabels(
  g: d3.Selection<SVGGElement, unknown, null, undefined>,
  innerWidth: number,
  innerHeight: number,
  margin: { top: number; right: number; bottom: number; left: number },
  xLabel: string
): void {
  g.append('text')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + margin.bottom - 5)
    .attr('text-anchor', 'middle')
    .attr('fill', '#94a3b8')
    .attr('font-size', '13px')
    .attr('font-weight', 'bold')
    .text(xLabel);

  g.append('text')
    .attr('x', -innerHeight / 2)
    .attr('y', -margin.left + 15)
    .attr('text-anchor', 'middle')
    .attr('transform', 'rotate(-90)')
    .attr('fill', '#94a3b8')
    .attr('font-size', '13px')
    .attr('font-weight', 'bold')
    .text('Weight (lbs)');
}
