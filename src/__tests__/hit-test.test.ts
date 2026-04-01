import { describe, it, expect } from "vitest";
import { hitTest } from "../hit-test.js";
import { Viewport } from "../viewport.js";
import { SpatialIndex } from "../spatial-index.js";
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

function setup(nodes: TextNode[]) {
  const viewport = new Viewport(800, 600);
  const spatialIndex = new SpatialIndex(100);
  const nodeMap = new Map<string, TextNode>();
  const insertionOrder: string[] = [];

  for (const n of nodes) {
    nodeMap.set(n.id, n);
    insertionOrder.push(n.id);
    spatialIndex.insert(n);
  }

  return { viewport, spatialIndex, nodeMap, insertionOrder };
}

describe("hitTest", () => {
  it("hits a node at its center", () => {
    const node = makeNode("a", 100, 100, 200, 50);
    const { viewport, spatialIndex, nodeMap, insertionOrder } = setup([node]);

    // Screen click at center of node: (200, 125) at zoom=1, no pan
    const result = hitTest(200, 125, viewport, spatialIndex, nodeMap, insertionOrder);
    expect(result).not.toBeNull();
    expect(result!.nodeId).toBe("a");
    expect(result!.worldX).toBeCloseTo(200);
    expect(result!.worldY).toBeCloseTo(125);
  });

  it("misses when clicking empty space", () => {
    const node = makeNode("a", 100, 100, 200, 50);
    const { viewport, spatialIndex, nodeMap, insertionOrder } = setup([node]);

    const result = hitTest(500, 500, viewport, spatialIndex, nodeMap, insertionOrder);
    expect(result).toBeNull();
  });

  it("respects viewport pan", () => {
    const node = makeNode("a", 100, 100, 200, 50);
    const { viewport, spatialIndex, nodeMap, insertionOrder } = setup([node]);

    viewport.set(50, 50, 1);

    // Node is at world (100, 100), screen = (100-50)*1 = (50, 50)
    // Click at screen (75, 75) => world (125, 125) which is inside the node
    const result = hitTest(75, 75, viewport, spatialIndex, nodeMap, insertionOrder);
    expect(result).not.toBeNull();
    expect(result!.nodeId).toBe("a");
  });

  it("respects viewport zoom", () => {
    const node = makeNode("a", 100, 100, 200, 50);
    const { viewport, spatialIndex, nodeMap, insertionOrder } = setup([node]);

    viewport.set(0, 0, 2);

    // At zoom=2, node screen position = (200, 200) to (600, 300)
    // Click at screen (300, 250) => world (150, 125), inside node
    const result = hitTest(300, 250, viewport, spatialIndex, nodeMap, insertionOrder);
    expect(result).not.toBeNull();
    expect(result!.nodeId).toBe("a");
  });

  it("returns topmost node when stacked", () => {
    const nodeA = makeNode("a", 100, 100, 200, 200);
    const nodeB = makeNode("b", 150, 150, 100, 100);
    const { viewport, spatialIndex, nodeMap, insertionOrder } = setup([nodeA, nodeB]);

    // Click at (175, 175) hits both, but b was inserted later
    const result = hitTest(175, 175, viewport, spatialIndex, nodeMap, insertionOrder);
    expect(result).not.toBeNull();
    expect(result!.nodeId).toBe("b");
  });

  it("hits bottom node in non-overlapping area", () => {
    const nodeA = makeNode("a", 100, 100, 200, 200);
    const nodeB = makeNode("b", 150, 150, 100, 100);
    const { viewport, spatialIndex, nodeMap, insertionOrder } = setup([nodeA, nodeB]);

    // Click at (110, 110) is inside A but not B
    const result = hitTest(110, 110, viewport, spatialIndex, nodeMap, insertionOrder);
    expect(result).not.toBeNull();
    expect(result!.nodeId).toBe("a");
  });
});
