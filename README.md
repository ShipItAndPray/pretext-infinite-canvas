# @shipitandpray/pretext-infinite-canvas

Figma/Miro-style infinite canvas where text nodes render with correct wrapping at any zoom level. Powered by [@chenglou/pretext](https://www.npmjs.com/package/@chenglou/pretext) for text measurement. Zero ghosting on first paint.

**[Live Demo](https://shipitandpray.github.io/pretext-infinite-canvas/)**

## Why

Canvas has no layout engine. To render multiline text you need to know line breaks, heights, and widths before drawing. Pretext's `prepare()` measures text once; `layout()` is pure arithmetic after that. This means:

- Bounding boxes are known before any draw call (zero layout shift)
- Text wraps identically at every zoom level
- Hit testing works with pre-computed bounds
- Spatial culling uses exact dimensions

## Install

```bash
npm install @shipitandpray/pretext-infinite-canvas @chenglou/pretext
```

`@chenglou/pretext` is a peer dependency.

## Quick start

```typescript
import { createCanvas } from "@shipitandpray/pretext-infinite-canvas";

// Create the canvas
const canvas = createCanvas({
  width: 1280,
  height: 720,
  font: "16px Inter",
  lineHeight: 22,
  devicePixelRatio: window.devicePixelRatio,
});

// Add text nodes — bounds are known immediately
const bounds = canvas.addTextNode(
  "title",
  "Hello infinite canvas!",
  100,
  100,
  300
);
console.log(bounds); // { width: 300, height: 22, lineCount: 1 }

// Add a styled node
canvas.addTextNode("body", "This is a longer paragraph that will wrap.", 100, 150, 300, {
  fontSize: 14,
  color: "#666",
  lineHeight: 20,
});

// Pan and zoom
canvas.setViewport(50, 50, 1.5);

// Get only visible nodes (spatial culling)
const visible = canvas.getVisibleNodes();

// Hit test at a screen coordinate
const hit = canvas.hitTest(200, 180);
if (hit) {
  console.log(`Clicked on node: ${hit.nodeId}`);
}

// Render to a <canvas> element
const ctx = document.querySelector("canvas")!.getContext("2d")!;
canvas.render(ctx);
```

## API

### `createCanvas(options)`

Factory function. Returns a `PretextCanvas` instance.

```typescript
interface CanvasOptions {
  width: number;          // Canvas width in CSS pixels
  height: number;         // Canvas height in CSS pixels
  font: string;           // Default CSS font string (e.g. "16px Inter")
  lineHeight: number;     // Default line height in pixels
  devicePixelRatio?: number; // For HiDPI rendering (default: 1)
}
```

### `PretextCanvas`

#### Node management

| Method | Description |
|--------|-------------|
| `addTextNode(id, text, x, y, maxWidth, style?)` | Add a node. Returns bounds immediately. |
| `removeTextNode(id)` | Remove a node. Returns `true` if it existed. |
| `updateTextNode(id, text)` | Change text, re-measures. Returns new bounds. |
| `moveTextNode(id, x, y)` | Reposition without re-measuring. |
| `getTextNodeBounds(id)` | Get `{ width, height, lineCount }`. |
| `getTextNode(id)` | Get full `TextNode` object. |
| `getNodeIds()` | List all node IDs. |

#### Viewport

| Method | Description |
|--------|-------------|
| `setViewport(x, y, zoom)` | Pan/zoom. Zoom clamped to [0.01, 100]. |
| `getViewport()` | Returns `{ x, y, zoom }`. |

#### Queries

| Method | Description |
|--------|-------------|
| `hitTest(screenX, screenY)` | Find node at screen coordinate. Returns topmost. |
| `getVisibleNodes()` | Nodes in current viewport (spatial culling). |

#### Rendering

| Method | Description |
|--------|-------------|
| `render(ctx)` | Draw visible nodes to a `CanvasRenderingContext2D`. |

#### Serialization

| Method | Description |
|--------|-------------|
| `toJSON()` | Serialize state (nodes + viewport + options). |
| `fromJSON(data)` | Restore state. Re-measures all text with Pretext. |

### `TextNodeStyle`

```typescript
interface TextNodeStyle {
  font?: string;            // Full CSS font override
  fontSize?: number;        // Override font size in px
  fontWeight?: string;      // Override font weight
  lineHeight?: number;      // Override line height in px
  color?: string;           // Text fill color
  backgroundColor?: string; // Background rect color
}
```

## Architecture

```
src/
  types.ts          — All TypeScript interfaces
  canvas.ts         — PretextCanvas class (orchestrator)
  text-node.ts      — Pretext prepare/layout integration
  viewport.ts       — Pan/zoom coordinate transforms
  spatial-index.ts  — Grid-based spatial culling
  hit-test.ts       — Point-in-AABB hit testing
  renderer.ts       — Canvas2D draw calls
  index.ts          — Public exports + createCanvas factory
```

The spatial index uses a fixed-size grid (default 512px cells). Each text node is inserted into every cell its bounding box overlaps. Queries collect candidates from overlapping cells, then narrow-phase tests exact AABB intersection. This gives O(visible) culling instead of O(all).

## License

MIT
