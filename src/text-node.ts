import { prepare, layout, prepareWithSegments, layoutWithLines } from "@chenglou/pretext";
import type { PreparedText, PreparedTextWithSegments, LayoutLinesResult } from "@chenglou/pretext";
import type { TextNode, TextNodeBounds, TextNodeStyle } from "./types.js";

/**
 * Resolves the CSS font string for a text node, combining the node style
 * with the canvas-level default font.
 */
export function resolveFont(defaultFont: string, style?: TextNodeStyle): string {
  if (!style) return defaultFont;

  // If the style has a full font override, use it
  if (style.font) return style.font;

  // Otherwise compose from parts. Default font is something like "16px Inter".
  // We replace the size and weight if overridden.
  let font = defaultFont;

  if (style.fontSize) {
    // Replace the size portion (e.g. "16px" -> "20px")
    font = font.replace(/\d+(\.\d+)?px/, `${style.fontSize}px`);
  }

  if (style.fontWeight) {
    // Prepend weight if not already present
    if (!/^\d{3}\s|^(bold|normal|lighter|bolder)\s/i.test(font)) {
      font = `${style.fontWeight} ${font}`;
    } else {
      font = font.replace(/^\S+/, style.fontWeight);
    }
  }

  return font;
}

/**
 * Measures text using Pretext's prepare() + layout().
 *
 * This is the critical function that gives us zero-ghosting: we know
 * the exact bounding box BEFORE any rendering happens.
 */
export function measureText(
  text: string,
  maxWidth: number,
  font: string,
  lineHeight: number,
  style?: TextNodeStyle
): TextNodeBounds {
  const resolvedFont = resolveFont(font, style);
  const resolvedLineHeight = style?.lineHeight ?? lineHeight;

  const prepared = prepare(text, resolvedFont);
  const result = layout(prepared, maxWidth, resolvedLineHeight);

  return {
    width: maxWidth, // Pretext layouts use maxWidth as the constraint
    height: result.height,
    lineCount: result.lineCount,
  };
}

/**
 * Measures text and returns the full lines data for rendering.
 */
export function measureTextWithLines(
  text: string,
  maxWidth: number,
  font: string,
  lineHeight: number,
  style?: TextNodeStyle
): LayoutLinesResult & { prepared: PreparedTextWithSegments; resolvedFont: string; resolvedLineHeight: number } {
  const resolvedFont = resolveFont(font, style);
  const resolvedLineHeight = style?.lineHeight ?? lineHeight;

  const prepared = prepareWithSegments(text, resolvedFont);
  const result = layoutWithLines(prepared, maxWidth, resolvedLineHeight);

  return {
    ...result,
    prepared,
    resolvedFont,
    resolvedLineHeight,
  };
}

/**
 * Creates a TextNode object with pre-computed bounds.
 */
export function createTextNode(
  id: string,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: string,
  lineHeight: number,
  style?: TextNodeStyle
): TextNode {
  const bounds = measureText(text, maxWidth, font, lineHeight, style);
  return { id, text, x, y, maxWidth, bounds, style };
}
