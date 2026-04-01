import type { TextNode } from "./types.js";
import { Viewport } from "./viewport.js";
import { measureTextWithLines, resolveFont } from "./text-node.js";

/**
 * Renders visible text nodes to a Canvas2D context.
 *
 * For each visible node:
 * 1. Transform its world position to screen coordinates via the viewport.
 * 2. Use Pretext's layoutWithLines() to get exact line breaks.
 * 3. Draw each line at the correct screen position, scaled by zoom.
 *
 * Because Pretext measures once and layout is pure arithmetic,
 * text wraps identically at every zoom level with zero ghosting.
 */
export function renderNodes(
  ctx: CanvasRenderingContext2D,
  nodes: TextNode[],
  viewport: Viewport,
  defaultFont: string,
  defaultLineHeight: number,
  devicePixelRatio: number
): void {
  const viewportState = viewport.get();
  const { zoom } = viewportState;

  ctx.save();

  // Scale for HiDPI displays
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  for (const node of nodes) {
    const screen = viewport.worldToScreen(node.x, node.y);

    // Get lines from Pretext
    const linesResult = measureTextWithLines(
      node.text,
      node.maxWidth,
      defaultFont,
      defaultLineHeight,
      node.style
    );

    const { lines, resolvedFont, resolvedLineHeight } = linesResult;

    // Draw background if specified
    if (node.style?.backgroundColor) {
      ctx.fillStyle = node.style.backgroundColor;
      ctx.fillRect(
        screen.x,
        screen.y,
        node.bounds.width * zoom,
        node.bounds.height * zoom
      );
    }

    // Set text style
    const fontSize = parseFontSize(resolvedFont);
    const scaledFontSize = fontSize * zoom;
    const scaledFont = resolvedFont.replace(
      /\d+(\.\d+)?px/,
      `${scaledFontSize}px`
    );

    ctx.font = scaledFont;
    ctx.fillStyle = node.style?.color ?? "#000000";
    ctx.textBaseline = "top";

    // Draw each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineY = screen.y + i * resolvedLineHeight * zoom;
      ctx.fillText(line.text, screen.x, lineY);
    }
  }

  ctx.restore();
}

/**
 * Parse font size in pixels from a CSS font string.
 */
function parseFontSize(font: string): number {
  const match = font.match(/(\d+(?:\.\d+)?)px/);
  return match ? parseFloat(match[1]) : 16;
}
