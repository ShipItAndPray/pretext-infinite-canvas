import type { ViewportState, AABB } from "./types.js";

/**
 * Manages viewport transformations (pan + zoom) for an infinite canvas.
 *
 * World coordinates are the "real" positions of nodes.
 * Screen coordinates are pixel positions on the physical canvas element.
 *
 * Conversion:
 *   screenX = (worldX - viewport.x) * zoom
 *   screenY = (worldY - viewport.y) * zoom
 *   worldX  = screenX / zoom + viewport.x
 *   worldY  = screenY / zoom + viewport.y
 */
export class Viewport {
  private state: ViewportState = { x: 0, y: 0, zoom: 1 };
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  /** Set viewport position and zoom. Zoom is clamped to [0.01, 100]. */
  set(x: number, y: number, zoom: number): void {
    this.state = {
      x,
      y,
      zoom: Math.max(0.01, Math.min(100, zoom)),
    };
  }

  get(): ViewportState {
    return { ...this.state };
  }

  /** Resize the canvas dimensions (e.g. on window resize). */
  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  /** Convert world coordinates to screen coordinates. */
  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return {
      x: (wx - this.state.x) * this.state.zoom,
      y: (wy - this.state.y) * this.state.zoom,
    };
  }

  /** Convert screen coordinates to world coordinates. */
  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return {
      x: sx / this.state.zoom + this.state.x,
      y: sy / this.state.zoom + this.state.y,
    };
  }

  /**
   * Returns the world-space AABB currently visible in the viewport.
   */
  getVisibleBounds(): AABB {
    const { x, y, zoom } = this.state;
    return {
      minX: x,
      minY: y,
      maxX: x + this.canvasWidth / zoom,
      maxY: y + this.canvasHeight / zoom,
    };
  }

  /** Scale a world-space dimension to screen pixels. */
  worldToScreenScale(worldSize: number): number {
    return worldSize * this.state.zoom;
  }

  /** Scale a screen-pixel dimension to world units. */
  screenToWorldScale(screenSize: number): number {
    return screenSize / this.state.zoom;
  }
}
