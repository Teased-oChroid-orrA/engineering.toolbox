import { esc, num } from '../core/svg';
import type { BushingFigureModel } from './d3BushingFigureModel';

export function renderBushingFigureDefs(): string {
  return `
    <defs>
      <pattern id="hatchH" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(255,255,255,0.18)" stroke-width="0.6" />
      </pattern>
      <pattern id="hatchB" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
        <line x1="0" y1="0" x2="0" y2="3" stroke="#2dd4bf" stroke-width="0.8" />
      </pattern>
    </defs>`;
}

export function renderBushingFigureLabels(model: BushingFigureModel): string {
  return `
    <g font-family="ui-monospace, SFMono-Regular" font-size="${num(model.labelSize)}" fill="#cbd5e1">
      <text x="0" y="${num(model.titleY)}" text-anchor="middle">${esc('SECTION A-A')}</text>
      <text x="${num(model.housingLabelX)}" y="${num(model.housingLabelY)}" text-anchor="middle" opacity="0.7">${esc('Housing')}</text>
      <text x="${num(model.bushingLabelX)}" y="${num(model.bushingLabelY)}" text-anchor="middle" fill="#2dd4bf">${esc('Bushing')}</text>
    </g>`;
}
