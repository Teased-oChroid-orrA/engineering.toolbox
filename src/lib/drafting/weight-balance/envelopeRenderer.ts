/**
 * CG Envelope Renderer using D3
 */

import * as d3 from 'd3';
import type { CGEnvelope } from '$lib/core/weight-balance/types';
import { getCGAxisLabel, mapCGToDisplay, mapVertexToDisplay } from '$lib/core/weight-balance/displayAdapters';
import { drawAxisLabels, drawEnvelopes, drawGridAndAxes } from './envelopeRendererLayers';
import { drawCurrentCG } from './envelopeRendererCurrentCG';

export interface EnvelopeRenderConfig {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  currentCG?: { weight: number; cgPosition: number };
  uncertaintyBand?: { cgMin: number; cgMax: number };
  category?: string;
  useMACDisplay?: boolean;
  lemac?: number;
  mac?: number;
}

export function renderCGEnvelope(container: HTMLElement, envelopes: CGEnvelope[], config: EnvelopeRenderConfig): void {
  d3.select(container).selectAll('*').remove();

  const { width, height, margin, currentCG, uncertaintyBand, useMACDisplay = false, lemac, mac } = config;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('background', '#1e293b');
  const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
  const displayEnvelopes = toDisplayEnvelopes(envelopes, useMACDisplay, lemac, mac);
  const { xScale, yScale } = createScales(displayEnvelopes, innerWidth, innerHeight);

  drawGridAndAxes(g, xScale, yScale, innerWidth, innerHeight, useMACDisplay, lemac, mac);
  drawEnvelopes(g, displayEnvelopes, xScale, yScale, innerWidth, useMACDisplay);
  if (currentCG) {
    drawCurrentCG(
      g,
      currentCG,
      uncertaintyBand,
      envelopes,
      xScale,
      yScale,
      innerWidth,
      innerHeight,
      useMACDisplay,
      lemac,
      mac
    );
  }
  drawAxisLabels(g, innerWidth, innerHeight, margin, getCGAxisLabel(useMACDisplay));
}

function toDisplayEnvelopes(
  envelopes: CGEnvelope[],
  useMACDisplay: boolean,
  lemac?: number,
  mac?: number
): CGEnvelope[] {
  return envelopes.map((envelope) => ({
    ...envelope,
    vertices: envelope.vertices.map((vertex) => mapVertexToDisplay(vertex, useMACDisplay, lemac, mac)),
    forwardLimit: envelope.forwardLimit !== undefined ? mapCGToDisplay(envelope.forwardLimit, useMACDisplay, lemac, mac) : undefined,
    aftLimit: envelope.aftLimit !== undefined ? mapCGToDisplay(envelope.aftLimit, useMACDisplay, lemac, mac) : undefined
  }));
}

function createScales(
  envelopes: CGEnvelope[],
  innerWidth: number,
  innerHeight: number
): { xScale: d3.ScaleLinear<number, number>; yScale: d3.ScaleLinear<number, number> } {
  const allVertices = envelopes.flatMap((envelope) => envelope.vertices);
  const cgExtent = d3.extent(allVertices, (vertex) => vertex.cgPosition) as [number, number];
  const weightExtent = d3.extent(allVertices, (vertex) => vertex.weight) as [number, number];
  const cgPadding = (cgExtent[1] - cgExtent[0]) * 0.1;
  const weightPadding = (weightExtent[1] - weightExtent[0]) * 0.1;

  const xScale = d3.scaleLinear().domain([cgExtent[0] - cgPadding, cgExtent[1] + cgPadding]).range([0, innerWidth]);
  const yScale = d3
    .scaleLinear()
    .domain([weightExtent[1] + weightPadding, weightExtent[0] - weightPadding])
    .range([0, innerHeight]);
  return { xScale, yScale };
}
