/**
 * CG Envelope Renderer using D3
 * Visualizes the CG envelope boundaries and current aircraft position
 */

import * as d3 from 'd3';
import type { CGEnvelope, EnvelopePoint } from '$lib/core/weight-balance/types';

export interface EnvelopeRenderConfig {
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  currentCG?: { weight: number; cgPosition: number };
  category?: string;
}

export function renderCGEnvelope(
  container: HTMLElement,
  envelopes: CGEnvelope[],
  config: EnvelopeRenderConfig
): void {
  // Clear previous content
  d3.select(container).selectAll('*').remove();
  
  const { width, height, margin, currentCG } = config;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  // Create SVG
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('background', '#1e293b');
  
  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
  
  // Find data extents
  const allVertices = envelopes.flatMap(e => e.vertices);
  const cgExtent = d3.extent(allVertices, d => d.cgPosition) as [number, number];
  const weightExtent = d3.extent(allVertices, d => d.weight) as [number, number];
  
  // Add padding
  const cgPadding = (cgExtent[1] - cgExtent[0]) * 0.1;
  const weightPadding = (weightExtent[1] - weightExtent[0]) * 0.1;
  
  // Create scales
  const xScale = d3.scaleLinear()
    .domain([cgExtent[0] - cgPadding, cgExtent[1] + cgPadding])
    .range([0, innerWidth]);
  
  const yScale = d3.scaleLinear()
    .domain([weightExtent[1] + weightPadding, weightExtent[0] - weightPadding]) // Inverted
    .range([0, innerHeight]);
  
  // Add grid
  const xAxis = d3.axisBottom(xScale).ticks(10);
  const yAxis = d3.axisLeft(yScale).ticks(10);
  
  g.append('g')
    .attr('class', 'grid')
    .attr('transform', `translate(0,${innerHeight})`)
    .call(xAxis)
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line')
      .clone()
      .attr('y2', -innerHeight)
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.3))
    .call(g => g.selectAll('.tick text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px'));
  
  g.append('g')
    .attr('class', 'grid')
    .call(yAxis)
    .call(g => g.select('.domain').remove())
    .call(g => g.selectAll('.tick line')
      .clone()
      .attr('x2', innerWidth)
      .attr('stroke', '#334155')
      .attr('stroke-opacity', 0.3))
    .call(g => g.selectAll('.tick text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '11px'));
  
  // Category colors
  const categoryColors: Record<string, string> = {
    normal: '#22c55e',
    utility: '#eab308',
    acrobatic: '#ef4444'
  };
  
  // Render envelopes
  envelopes.forEach(envelope => {
    const line = d3.line<EnvelopePoint>()
      .x(d => xScale(d.cgPosition))
      .y(d => yScale(d.weight))
      .curve(d3.curveLinearClosed);
    
    const color = categoryColors[envelope.category] || '#64748b';
    
    // Fill
    g.append('path')
      .datum(envelope.vertices)
      .attr('d', line)
      .attr('fill', color)
      .attr('fill-opacity', 0.15)
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.8);
    
    // Label
    const centroid = getCentroid(envelope.vertices);
    g.append('text')
      .attr('x', xScale(centroid.cgPosition))
      .attr('y', yScale(centroid.weight))
      .attr('text-anchor', 'middle')
      .attr('fill', color)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(envelope.category.toUpperCase());
  });
  
  // Render current position
  if (currentCG) {
    const { weight, cgPosition } = currentCG;
    
    // Check if in envelope
    const inEnvelope = envelopes.some(e => 
      isPointInPolygon(cgPosition, weight, e.vertices)
    );
    
    const pointColor = inEnvelope ? '#22c55e' : '#ef4444';
    
    // Crosshair lines
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
      .attr('x1', xScale(cgPosition))
      .attr('x2', xScale(cgPosition))
      .attr('y1', 0)
      .attr('y2', innerHeight)
      .attr('stroke', pointColor)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,4')
      .attr('opacity', 0.5);
    
    // Point
    g.append('circle')
      .attr('cx', xScale(cgPosition))
      .attr('cy', yScale(weight))
      .attr('r', 6)
      .attr('fill', pointColor)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);
    
    // Label
    g.append('text')
      .attr('x', xScale(cgPosition) + 10)
      .attr('y', yScale(weight) - 10)
      .attr('fill', pointColor)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(`${weight.toFixed(0)} lbs @ ${cgPosition.toFixed(2)}"`);
  }
  
  // Axis labels
  g.append('text')
    .attr('x', innerWidth / 2)
    .attr('y', innerHeight + margin.bottom - 5)
    .attr('text-anchor', 'middle')
    .attr('fill', '#94a3b8')
    .attr('font-size', '13px')
    .attr('font-weight', 'bold')
    .text('CG Position (inches aft of datum)');
  
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

function getCentroid(vertices: EnvelopePoint[]): { cgPosition: number; weight: number } {
  const n = vertices.length;
  let cx = 0;
  let cy = 0;
  
  vertices.forEach(v => {
    cx += v.cgPosition;
    cy += v.weight;
  });
  
  return {
    cgPosition: cx / n,
    weight: cy / n
  };
}

function isPointInPolygon(x: number, y: number, vertices: EnvelopePoint[]): boolean {
  let inside = false;
  
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].cgPosition;
    const yi = vertices[i].weight;
    const xj = vertices[j].cgPosition;
    const yj = vertices[j].weight;
    
    const intersect = ((yi > y) !== (yj > y))
      && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  
  return inside;
}
