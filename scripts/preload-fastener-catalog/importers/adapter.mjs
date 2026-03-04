export function buildStandardGripTable(gripCodes) {
  const count = Math.max(1, Number(gripCodes) || 1);
  return Array.from({ length: count }, (_, index) => ({
    gripCode: String(index + 1),
    nominalGripIn: (index + 1) / 16,
    incrementIn: 1 / 16
  }));
}

export function validateCatalogArtifact(artifact) {
  if (!artifact || !Array.isArray(artifact.entries) || !Array.isArray(artifact.dashVariants) || !Array.isArray(artifact.gripTable)) {
    throw new Error('Catalog artifact must contain entries, dashVariants, and gripTable arrays.');
  }
  for (const entry of artifact.entries) {
    if (!entry.id || !entry.materialId || !entry.headStyle || !entry.threadDetail) {
      throw new Error(`Invalid catalog entry: ${JSON.stringify(entry)}`);
    }
  }
  for (const variant of artifact.dashVariants) {
    if (!variant.dash || !Number.isFinite(Number(variant.nominalDiameterIn)) || Number(variant.nominalDiameterIn) <= 0) {
      throw new Error(`Invalid dash variant: ${JSON.stringify(variant)}`);
    }
  }
  for (const grip of artifact.gripTable) {
    if (!grip.gripCode || !Number.isFinite(Number(grip.nominalGripIn)) || Number(grip.nominalGripIn) <= 0) {
      throw new Error(`Invalid grip entry: ${JSON.stringify(grip)}`);
    }
  }
  return artifact;
}
