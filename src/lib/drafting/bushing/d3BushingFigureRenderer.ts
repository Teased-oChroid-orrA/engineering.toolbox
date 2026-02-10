import { num } from '../core/svg';
import { renderBushingFigureDefs, renderBushingFigureLabels } from './d3BushingFigureAnnotations';
import { createBaseBushingModel, type BushingFigureInputs, type BushingFigureModel, type BushingFigureProjection } from './d3BushingFigureModel';

export function buildBushingFigureModel(inputs: BushingFigureInputs): BushingFigureModel {
  return createBaseBushingModel(inputs);
}

export function renderBushingFigureGroup(model: BushingFigureModel, projection: BushingFigureProjection): string {
  return `
  <g transform="translate(${num(projection.tx)} ${num(projection.ty)}) scale(${num(projection.scale)})">
    ${renderBushingFigureDefs()}
    <g>
      <path d="${model.leftHousingPath}" fill="url(#hatchH)" stroke="#94a3b8" stroke-width="0.9" />
      <path d="${model.rightHousingPath}" fill="url(#hatchH)" stroke="#94a3b8" stroke-width="0.9" />
    </g>
    <g>
      <path d="${model.leftBushingPath}" fill="url(#hatchB)" stroke="#2dd4bf" stroke-width="1.1" />
      <path d="${model.rightBushingPath}" fill="url(#hatchB)" stroke="#2dd4bf" stroke-width="1.1" />
    </g>
    <path d="${model.centerlineVerticalPath}" stroke="rgba(255,255,255,0.35)" stroke-dasharray="5,3" />
    <path d="${model.centerlineHorizontalPath}" stroke="rgba(255,255,255,0.15)" stroke-dasharray="4,4" />
    ${renderBushingFigureLabels(model)}
  </g>`;
}
