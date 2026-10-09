import { MapGeneratorRegistry } from './registry';
import { printLoop, whichRange } from './loopBounds';
import { accumulatorInit, baseCase, indexVsValue, whileCondition } from './basics';

/** Add new generators here. This is the ONLY place that lists them. */
export function createDefaultGenerators(): MapGeneratorRegistry {
  return new MapGeneratorRegistry([printLoop, whichRange, accumulatorInit, whileCondition, indexVsValue, baseCase]);
}
export { MapGeneratorRegistry };
