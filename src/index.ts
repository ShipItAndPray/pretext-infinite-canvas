export { PretextCanvas } from "./canvas.js";
export { Viewport } from "./viewport.js";
export { SpatialIndex, aabbOverlaps, aabbContainsPoint } from "./spatial-index.js";
export { hitTest } from "./hit-test.js";
export type { HitTestResult } from "./hit-test.js";
export { createTextNode, measureText, resolveFont } from "./text-node.js";
export { renderNodes } from "./renderer.js";

export type {
  TextNode,
  TextNodeStyle,
  TextNodeBounds,
  ViewportState,
  AABB,
  CanvasOptions,
  CanvasSnapshot,
} from "./types.js";

/**
 * Convenience factory that creates a PretextCanvas instance.
 */
import type { CanvasOptions } from "./types.js";
import { PretextCanvas } from "./canvas.js";

export function createCanvas(options: CanvasOptions): PretextCanvas {
  return new PretextCanvas(options);
}
