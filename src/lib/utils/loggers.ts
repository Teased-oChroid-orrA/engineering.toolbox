/**
 * Pre-configured logger instances for different application modules.
 * 
 * **Usage:**
 * ```typescript
 * import { bushingLogger, inspectorLogger } from '$lib/utils/loggers';
 * 
 * bushingLogger.debug('Computing bushing...', { inputs });
 * inspectorLogger.info('CSV loaded', { rows: 1000 });
 * ```
 * 
 * **Benefits:**
 * - Consistent namespace across modules
 * - Easy to enable/disable logging per module
 * - Centralized configuration
 */

import { createLogger } from './logger';

// Core module loggers
export const bushingLogger = createLogger('Bushing');
export const surfaceLogger = createLogger('Surface');
export const inspectorLogger = createLogger('Inspector');
export const shearLogger = createLogger('Shear');
export const wbLogger = createLogger('WeightBalance');

// Component loggers
export const bushingOrchestratorLogger = createLogger('BushingOrchestrator');
export const inspectorOrchestratorLogger = createLogger('InspectorOrchestrator');
export const surfaceOrchestratorLogger = createLogger('SurfaceOrchestrator');

// Controller loggers
export const bushingComputeLogger = createLogger('BushingCompute');
export const bushingExportLogger = createLogger('BushingExport');
export const bushingDragLogger = createLogger('BushingDrag');
export const inspectorLoadLogger = createLogger('InspectorLoad');
export const inspectorQueryLogger = createLogger('InspectorQuery');
export const inspectorSchemaLogger = createLogger('InspectorSchema');

// Lifecycle loggers
export const lifecycleLogger = createLogger('Lifecycle');
export const mountLogger = createLogger('Mount');

// Performance loggers
export const perfLogger = createLogger('Performance');
export const cacheLogger = createLogger('Cache');

// Storage loggers
export const storageLogger = createLogger('Storage');
export const persistenceLogger = createLogger('Persistence');

// Error loggers
export const errorLogger = createLogger('Error');
export const validationLogger = createLogger('Validation');
