import { describe, it, expect } from "vitest";
import { SpatialIndex, aabbOverlaps, aabbContainsPoint } from "../spatial-index.js";
import type { TextNode } from "../types.js";

function makeNode(id: string, x: number, y: number, w: number, h: number): TextNode {
  return {
    id,
    text: "test",
    x,
    y,
    maxWidth: w,
    bounds: { width: w, height: h, lineCount: 1 },
  };
}

describe("SpatialIndex", () => {
  it("inserts and queries a single node", () => {
    const idx = new SpatialIndex(100);
    idx.insert(makeNode("a", 50, 50, 80, 30));

    const hits = idx.query({ minX: 0, minY: 0, maxX: 200, maxY: 200 });
    expect(hits).toEqual(["a"]);
  });

  it("returns empty for non-overlapping query", () => {
    const idx = new SpatialIndex(100);
    idx.insert(makeNode("a", 50, 50, 80, 30));

    const hits = idx.query({ minX: 500, minY: 500, maxX: 600, maxY: 600 });
    expect(hits).toEqual([]);
  });

  it("handles nodes spanning multiple cells", () => {
    const idx = new SpatialIndex(100);
    // Node at (90, 90) with size 40x40 spans cells (0,0), (0,1), (1,0), (1,1)
    idx.insert(makeNode("big", 90, 90, 40, 40));

    // Query in cell (1,1) area
    const hits = idx.query({ minX: 110, minY: 110, maxX: 120, maxY: 120 });
    expect(hits).toEqual(["big"]);
  });

  it("returns multiple nodes", () => {
    const idx = new SpatialIndex(100);
    idx.insert(makeNode("a", 10, 10, 30, 20));
    idx.insert(makeNode("b", 50, 50, 30, 20));
    idx.insert(makeNode("c", 500, 500, 30, 20));

    const hits = idx.query({ minX: 0, minY: 0, maxX: 200, maxY: 200 });
    expect(hits.sort()).toEqual(["a", "b"]);
  });

  it("removes nodes", () => {
    const idx = new SpatialIndex(100);
    idx.insert(makeNode("a", 10, 10, 30, 20));
    idx.insert(makeNode("b", 50, 50, 30, 20));

    idx.remove("a");

    const hits = idx.query({ minX: 0, minY: 0, maxX: 200, maxY: 200 });
    expect(hits).toEqual(["b"]);
  });

  it("updates node position on re-insert", () => {
    const idx = new SpatialIndex(100);
    idx.insert(makeNode("a", 10, 10, 30, 20));

    // Move to a completely different cell
    idx.insert(makeNode("a", 600, 600, 30, 20));

    // Old position should be empty
    const oldHits = idx.query({ minX: 0, minY: 0, maxX: 100, maxY: 100 });
    expect(oldHits).toEqual([]);

    // New position should have it
    const newHits = idx.query({ minX: 580, minY: 580, maxX: 650, maxY: 650 });
    expect(newHits).toEqual(["a"]);
  });

  it("deduplicates candidates from multi-cell queries", () => {
    const idx = new SpatialIndex(100);
    // Large node spanning many cells
    idx.insert(makeNode("wide", 0, 0, 300, 300));

    const hits = idx.query({ minX: 0, minY: 0, maxX: 300, maxY: 300 });
    expect(hits).toEqual(["wide"]);
  });

  it("clear removes everything", () => {
    const idx = new SpatialIndex(100);
    idx.insert(makeNode("a", 10, 10, 30, 20));
    idx.insert(makeNode("b", 50, 50, 30, 20));

    idx.clear();

    const hits = idx.query({ minX: 0, minY: 0, maxX: 10000, maxY: 10000 });
    expect(hits).toEqual([]);
  });

  it("getBounds returns stored AABB", () => {
    const idx = new SpatialIndex(100);
    idx.insert(makeNode("a", 10, 20, 50, 30));

    const bounds = idx.getBounds("a");
    expect(bounds).toEqual({ minX: 10, minY: 20, maxX: 60, maxY: 50 });
  });

  it("getBounds returns undefined for missing node", () => {
    const idx = new SpatialIndex(100);
    expect(idx.getBounds("missing")).toBeUndefined();
  });

  it("handles negative coordinates", () => {
    const idx = new SpatialIndex(100);
    idx.insert(makeNode("neg", -50, -50, 30, 20));

    const hits = idx.query({ minX: -100, minY: -100, maxX: 0, maxY: 0 });
    expect(hits).toEqual(["neg"]);
  });
});

describe("aabbOverlaps", () => {
  it("detects overlapping boxes", () => {
    expect(
      aabbOverlaps(
        { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        { minX: 5, minY: 5, maxX: 15, maxY: 15 }
      )
    ).toBe(true);
  });

  it("rejects non-overlapping boxes", () => {
    expect(
      aabbOverlaps(
        { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        { minX: 20, minY: 20, maxX: 30, maxY: 30 }
      )
    ).toBe(false);
  });

  it("rejects touching edges (exclusive boundary)", () => {
    expect(
      aabbOverlaps(
        { minX: 0, minY: 0, maxX: 10, maxY: 10 },
        { minX: 10, minY: 0, maxX: 20, maxY: 10 }
      )
    ).toBe(false);
  });
});

describe("aabbContainsPoint", () => {
  it("point inside", () => {
    expect(aabbContainsPoint({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, 5, 5)).toBe(true);
  });

  it("point on edge", () => {
    expect(aabbContainsPoint({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, 0, 5)).toBe(true);
    expect(aabbContainsPoint({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, 10, 10)).toBe(true);
  });

  it("point outside", () => {
    expect(aabbContainsPoint({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, 15, 5)).toBe(false);
  });
});
