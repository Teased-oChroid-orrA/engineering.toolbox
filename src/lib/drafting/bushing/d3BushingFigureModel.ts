import { buildBushingScene, type BushingSceneInputs } from './bushingSceneModel';

export type BushingFigureInputs = BushingSceneInputs;

export type BushingFigureModel = {
  D: number;
  L: number;
  W: number;
  ID: number;
  od: number;
  vbW: number;
  vbH: number;
  leftHousingPath: string;
  rightHousingPath: string;
  leftBushingPath: string;
  rightBushingPath: string;
  centerlineVerticalPath: string;
  centerlineHorizontalPath: string;
  titleY: number;
  housingLabelX: number;
  housingLabelY: number;
  bushingLabelX: number;
  bushingLabelY: number;
  labelSize: number;
};

export type BushingFigureProjection = {
  tx: number;
  ty: number;
  scale: number;
};

export function createBaseBushingModel(inputs: BushingFigureInputs): BushingFigureModel {
  const scene = buildBushingScene(inputs);
  const D = Number(inputs?.boreDia ?? 0.5);
  const L = Number(inputs?.housingLen ?? 0.5);
  const W = Number(inputs?.housingWidth ?? 1.5);
  const ID = Number(inputs?.idBushing ?? 0.375);
  const od = Number(inputs?.geometry?.odBushing ?? inputs?.boreDia ?? 0.5);
  return {
    D,
    L,
    W,
    ID,
    od,
    vbW: scene.width,
    vbH: scene.height,
    leftHousingPath: scene.leftHousingPath,
    rightHousingPath: scene.rightHousingPath,
    leftBushingPath: scene.leftBushingPath,
    rightBushingPath: scene.rightBushingPath,
    centerlineVerticalPath: scene.centerlineVerticalPath,
    centerlineHorizontalPath: scene.centerlineHorizontalPath,
    titleY: scene.label.titleY,
    housingLabelX: scene.label.housingX,
    housingLabelY: scene.label.housingY,
    bushingLabelX: scene.label.bushingX,
    bushingLabelY: scene.label.bushingY,
    labelSize: scene.label.fontSize
  };
}

export function projectBushingFigure(model: BushingFigureModel, vp: { x: number; y: number; w: number; h: number }): BushingFigureProjection {
  return {
    scale: Math.min(vp.w / model.vbW, vp.h / model.vbH),
    tx: vp.x + vp.w / 2,
    ty: vp.y + vp.h / 2
  };
}
