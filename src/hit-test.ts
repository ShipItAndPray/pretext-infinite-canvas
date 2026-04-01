import type { TextNode, ViewportState } from "./types.js";
import { SpatialIndex, aabbContainsPoint } from "./spatial-index.js";
import { Viewport } from "./viewport.js";

/**
 * Result of a hit test.
 */
export interface HitTestResult {
  nodeId: string;
  /** World-space coordinates of the hit point. */
  worldX: number;
  worldY: number;
}

/**
 * Performs hit testing against text nodes using pre-computed bounding boxes.
 *
 * 1. Convert screen coords to world coords via the viewport.
 * 2. Query the spatial index for candidate nodes near that point.
 * 3. Test candidates against their exact AABBs.
 * 4. If multiple overlap (stacked nodes), return the last one added (highest z).
 */
export function hitTest(
  screenX: number,
  screenY: number,
  viewport: Viewport,
  spatialIndex: SpatialIndex,
  nodes: Map<string, TextNode>,
  insertionOrder: string[]
): HitTestResult | null {
  const world = viewport.screenToWorld(screenX, screenY);

  // Build a tiny query AABB around the world point
  const epsilon = 0.5;
  const candidates = spatialIndex.query({
    minX: world.x - epsilon,
    minY: world.y - epsilon,
    maxX: world.x + epsilon,
    maxY: world.y + epsilon,
  });

  if (candidates.length === 0) return null;

  // Check exact bounds, prefer last-inserted (top of visual stack)
  let bestId: string | null = null;
  let bestOrder = -1;

  for (const id of candidates) {
    const node = nodes.get(id);
    if (!node) continue;

    const aabb = SpatialIndex.nodeAABB(node);
    if (aabbContainsPoint(aabb, world.x, world.y)) {
      const order = insertionOrder.indexOf(id);
      if (order > bestOrder) {
        bestOrder = order;
        bestId = id;
      }
    }
  }

  if (!bestId) return null;

  return {
    nodeId: bestId,
    worldX: world.x,
    worldY: world.y,
  };
}
