import type {
  CanvasOptions,
  CanvasSnapshot,
  TextNode,
  TextNodeBounds,
  TextNodeStyle,
  ViewportState,
} from "./types.js";
import { Viewport } from "./viewport.js";
import { SpatialIndex } from "./spatial-index.js";
import { hitTest, type HitTestResult } from "./hit-test.js";
import { createTextNode, measureText } from "./text-node.js";
import { renderNodes } from "./renderer.js";

/**
 * PretextCanvas — an infinite canvas with pixel-perfect text at any zoom.
 *
 * Text nodes are measured with @chenglou/pretext's prepare() + layout()
 * so bounding boxes are known before any draw call. This means:
 * - Zero ghosting on first paint (no layout shift)
 * - Hit testing works with pre-computed bounds
 * - Spatial culling uses exact dimensions
 * - Zoom doesn't change text wrapping
 */
export class PretextCanvas {
  private nodes = new Map<string, TextNode>();
  private insertionOrder: string[] = [];
  private viewport: Viewport;
  private spatialIndex: SpatialIndex;
  private options: CanvasOptions;
  private dpr: number;

  constructor(options: CanvasOptions) {
    this.options = { ...options };
    this.dpr = options.devicePixelRatio ?? 1;
    this.viewport = new Viewport(options.width, options.height);
    this.spatialIndex = new SpatialIndex();
  }

  // ── Node management ──────────────────────────────────────────────

  /**
   * Add a text node. Pretext measures it immediately so the bounding
   * box is available before any render.
   */
  addTextNode(
    id: string,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    style?: TextNodeStyle
  ): TextNodeBounds {
    const node = createTextNode(
      id,
      text,
      x,
      y,
      maxWidth,
      this.options.font,
      this.options.lineHeight,
      style
    );
    this.nodes.set(id, node);
    this.insertionOrder.push(id);
    this.spatialIndex.insert(node);
    return { ...node.bounds };
  }

  /** Remove a text node. */
  removeTextNode(id: string): boolean {
    const existed = this.nodes.delete(id);
    if (existed) {
      this.spatialIndex.remove(id);
      const idx = this.insertionOrder.indexOf(id);
      if (idx !== -1) this.insertionOrder.splice(idx, 1);
    }
    return existed;
  }

  /** Update text content. Re-measures with Pretext. */
  updateTextNode(id: string, text: string): TextNodeBounds | null {
    const node = this.nodes.get(id);
    if (!node) return null;

    const bounds = measureText(
      text,
      node.maxWidth,
      this.options.font,
      this.options.lineHeight,
      node.style
    );

    const updated: TextNode = { ...node, text, bounds };
    this.nodes.set(id, updated);
    this.spatialIndex.insert(updated);
    return { ...bounds };
  }

  /** Move a node without re-measuring text (position change only). */
  moveTextNode(id: string, x: number, y: number): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    const moved: TextNode = { ...node, x, y };
    this.nodes.set(id, moved);
    this.spatialIndex.insert(moved); // re-indexes in new position
    return true;
  }

  /** Get the pre-computed bounding box for a node. */
  getTextNodeBounds(id: string): TextNodeBounds | null {
    const node = this.nodes.get(id);
    return node ? { ...node.bounds } : null;
  }

  /** Get a text node by ID. */
  getTextNode(id: string): TextNode | null {
    const node = this.nodes.get(id);
    return node ? { ...node } : null;
  }

  /** Get all node IDs. */
  getNodeIds(): string[] {
    return [...this.nodes.keys()];
  }

  // ── Viewport ─────────────────────────────────────────────────────

  /** Set viewport position and zoom. */
  setViewport(x: number, y: number, zoom: number): void {
    this.viewport.set(x, y, zoom);
  }

  /** Get current viewport state. */
  getViewport(): ViewportState {
    return this.viewport.get();
  }

  // ── Queries ──────────────────────────────────────────────────────

  /**
   * Hit test: find which text node is at a screen coordinate.
   * Uses pre-computed Pretext bounding boxes via the spatial index.
   */
  hitTest(screenX: number, screenY: number): HitTestResult | null {
    return hitTest(
      screenX,
      screenY,
      this.viewport,
      this.spatialIndex,
      this.nodes,
      this.insertionOrder
    );
  }

  /**
   * Returns only nodes visible in the current viewport.
   * Uses the spatial index for O(visible) culling instead of O(all).
   */
  getVisibleNodes(): TextNode[] {
    const bounds = this.viewport.getVisibleBounds();
    const ids = this.spatialIndex.query(bounds);
    const result: TextNode[] = [];
    for (const id of ids) {
      const node = this.nodes.get(id);
      if (node) result.push(node);
    }
    return result;
  }

  // ── Rendering ────────────────────────────────────────────────────

  /**
   * Render all visible text nodes to a Canvas2D context.
   * Only draws nodes within the current viewport.
   */
  render(ctx: CanvasRenderingContext2D): void {
    const visible = this.getVisibleNodes();
    renderNodes(
      ctx,
      visible,
      this.viewport,
      this.options.font,
      this.options.lineHeight,
      this.dpr
    );
  }

  // ── Serialization ────────────────────────────────────────────────

  /** Serialize canvas state to a JSON-safe object. */
  toJSON(): CanvasSnapshot {
    const nodeData = this.insertionOrder.map((id) => {
      const node = this.nodes.get(id)!;
      return {
        id: node.id,
        text: node.text,
        x: node.x,
        y: node.y,
        maxWidth: node.maxWidth,
        style: node.style,
      };
    });

    return {
      version: 1,
      viewport: this.viewport.get(),
      nodes: nodeData,
      options: { ...this.options },
    };
  }

  /**
   * Restore canvas state from a snapshot.
   * Re-measures all text nodes with Pretext (the snapshot doesn't
   * store bounds because they depend on the font environment).
   */
  fromJSON(data: CanvasSnapshot): void {
    // Reset state
    this.nodes.clear();
    this.insertionOrder = [];
    this.spatialIndex.clear();

    // Restore options
    this.options = { ...data.options };
    this.dpr = data.options.devicePixelRatio ?? 1;
    this.viewport = new Viewport(data.options.width, data.options.height);
    this.viewport.set(data.viewport.x, data.viewport.y, data.viewport.zoom);

    // Re-add all nodes (this re-measures each one)
    for (const n of data.nodes) {
      this.addTextNode(n.id, n.text, n.x, n.y, n.maxWidth, n.style);
    }
  }
}
