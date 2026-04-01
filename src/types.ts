/**
 * Style options for a text node.
 */
export interface TextNodeStyle {
  font?: string;
  fontSize?: number;
  fontWeight?: string;
  lineHeight?: number;
  color?: string;
  backgroundColor?: string;
}

/**
 * Pre-computed bounding box from Pretext layout.
 */
export interface TextNodeBounds {
  width: number;
  height: number;
  lineCount: number;
}

/**
 * A text node on the infinite canvas.
 */
export interface TextNode {
  id: string;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  bounds: TextNodeBounds;
  style?: TextNodeStyle;
}

/**
 * Viewport state: position + zoom level.
 */
export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Axis-aligned bounding box used for spatial queries.
 */
export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Options for creating a PretextCanvas instance.
 */
export interface CanvasOptions {
  width: number;
  height: number;
  font: string;
  lineHeight: number;
  devicePixelRatio?: number;
}

/**
 * Serialized canvas state for toJSON/fromJSON.
 */
export interface CanvasSnapshot {
  version: 1;
  viewport: ViewportState;
  nodes: Array<{
    id: string;
    text: string;
    x: number;
    y: number;
    maxWidth: number;
    style?: TextNodeStyle;
  }>;
  options: CanvasOptions;
}
