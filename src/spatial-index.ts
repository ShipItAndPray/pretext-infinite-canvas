import type { AABB, TextNode } from "./types.js";

/**
 * Grid-based spatial index for fast culling of text nodes.
 *
 * The world is divided into square cells of `cellSize` units.
 * Each node is inserted into every cell its bounding box overlaps.
 * Queries collect candidates from all cells the query AABB overlaps,
 * then deduplicate.
 */
export class SpatialIndex {
  private cellSize: number;
  private cells = new Map<string, Set<string>>();
  private nodeBounds = new Map<string, AABB>();

  constructor(cellSize = 512) {
    this.cellSize = cellSize;
  }

  /** Compute the grid cell key for a world-space coordinate. */
  private cellKey(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  /** Get the grid cell indices that an AABB overlaps. */
  private getCells(aabb: AABB): Array<{ cx: number; cy: number }> {
    const cs = this.cellSize;
    const minCX = Math.floor(aabb.minX / cs);
    const minCY = Math.floor(aabb.minY / cs);
    const maxCX = Math.floor(aabb.maxX / cs);
    const maxCY = Math.floor(aabb.maxY / cs);

    const result: Array<{ cx: number; cy: number }> = [];
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        result.push({ cx, cy });
      }
    }
    return result;
  }

  /** Build an AABB from a TextNode's position and pre-computed bounds. */
  static nodeAABB(node: TextNode): AABB {
    return {
      minX: node.x,
      minY: node.y,
      maxX: node.x + node.bounds.width,
      maxY: node.y + node.bounds.height,
    };
  }

  /** Insert or update a node in the index. */
  insert(node: TextNode): void {
    // Remove old entry first if it exists
    this.remove(node.id);

    const aabb = SpatialIndex.nodeAABB(node);
    this.nodeBounds.set(node.id, aabb);

    for (const { cx, cy } of this.getCells(aabb)) {
      const key = this.cellKey(cx, cy);
      let cell = this.cells.get(key);
      if (!cell) {
        cell = new Set();
        this.cells.set(key, cell);
      }
      cell.add(node.id);
    }
  }

  /** Remove a node from the index. */
  remove(id: string): void {
    const aabb = this.nodeBounds.get(id);
    if (!aabb) return;

    for (const { cx, cy } of this.getCells(aabb)) {
      const key = this.cellKey(cx, cy);
      const cell = this.cells.get(key);
      if (cell) {
        cell.delete(id);
        if (cell.size === 0) this.cells.delete(key);
      }
    }
    this.nodeBounds.delete(id);
  }

  /**
   * Query all node IDs whose bounding boxes overlap with the given AABB.
   * Uses the grid for broad-phase, then does exact AABB-AABB intersection.
   */
  query(queryAABB: AABB): string[] {
    const candidateIds = new Set<string>();

    for (const { cx, cy } of this.getCells(queryAABB)) {
      const key = this.cellKey(cx, cy);
      const cell = this.cells.get(key);
      if (cell) {
        for (const id of cell) {
          candidateIds.add(id);
        }
      }
    }

    // Narrow-phase: exact AABB overlap test
    const result: string[] = [];
    for (const id of candidateIds) {
      const aabb = this.nodeBounds.get(id)!;
      if (aabbOverlaps(aabb, queryAABB)) {
        result.push(id);
      }
    }
    return result;
  }

  /** Clear the entire index. */
  clear(): void {
    this.cells.clear();
    this.nodeBounds.clear();
  }

  /** Get the stored AABB for a node. */
  getBounds(id: string): AABB | undefined {
    return this.nodeBounds.get(id);
  }
}

/** Test whether two AABBs overlap (share any area). */
export function aabbOverlaps(a: AABB, b: AABB): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}

/** Test whether point (px, py) is inside an AABB. */
export function aabbContainsPoint(aabb: AABB, px: number, py: number): boolean {
  return px >= aabb.minX && px <= aabb.maxX && py >= aabb.minY && py <= aabb.maxY;
}
