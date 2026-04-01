import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @chenglou/pretext before importing canvas
vi.mock("@chenglou/pretext", () => {
  return {
    prepare: vi.fn((text: string, _font: string) => {
      // Return a branded mock object
      return { __brand: "PreparedText", text } as any;
    }),
    prepareWithSegments: vi.fn((text: string, _font: string) => {
      return {
        __brand: "PreparedTextWithSegments",
        text,
        segments: text.split(" "),
      } as any;
    }),
    layout: vi.fn((_prepared: any, maxWidth: number, lineHeight: number) => {
      // Deterministic: assume 8px per character, wrap at maxWidth
      const text: string = _prepared.text ?? "";
      const charWidth = 8;
      const totalWidth = text.length * charWidth;
      const lineCount = Math.max(1, Math.ceil(totalWidth / maxWidth));
      return {
        lineCount,
        height: lineCount * lineHeight,
      };
    }),
    layoutWithLines: vi.fn(
      (_prepared: any, maxWidth: number, lineHeight: number) => {
        const text: string = _prepared.text ?? "";
        const charWidth = 8;
        const charsPerLine = Math.max(1, Math.floor(maxWidth / charWidth));
        const lines: any[] = [];

        for (let i = 0; i < text.length; i += charsPerLine) {
          const lineText = text.slice(i, i + charsPerLine);
          lines.push({
            text: lineText,
            width: lineText.length * charWidth,
            start: { segmentIndex: 0, graphemeIndex: i },
            end: {
              segmentIndex: 0,
              graphemeIndex: Math.min(i + charsPerLine, text.length),
            },
          });
        }

        return {
          lineCount: lines.length,
          height: lines.length * lineHeight,
          lines,
        };
      }
    ),
  };
});

import { PretextCanvas } from "../canvas.js";

const defaultOpts = {
  width: 800,
  height: 600,
  font: "16px Inter",
  lineHeight: 20,
};

describe("PretextCanvas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addTextNode", () => {
    it("adds a node and returns bounds", () => {
      const canvas = new PretextCanvas(defaultOpts);
      const bounds = canvas.addTextNode("n1", "Hello world", 10, 20, 200);

      expect(bounds).toBeDefined();
      expect(bounds.lineCount).toBeGreaterThanOrEqual(1);
      expect(bounds.height).toBeGreaterThan(0);
    });

    it("stores the node so it can be retrieved", () => {
      const canvas = new PretextCanvas(defaultOpts);
      canvas.addTextNode("n1", "Hello", 10, 20, 200);

      const node = canvas.getTextNode("n1");
      expect(node).not.toBeNull();
      expect(node!.text).toBe("Hello");
      expect(node!.x).toBe(10);
      expect(node!.y).toBe(20);
    });

    it("supports custom style", () => {
      const canvas = new PretextCanvas(defaultOpts);
      canvas.addTextNode("n1", "Styled", 0, 0, 200, {
        color: "#ff0000",
        fontSize: 24,
      });

      const node = canvas.getTextNode("n1");
      expect(node!.style?.color).toBe("#ff0000");
      expect(node!.style?.fontSize).toBe(24);
    });
  });

  describe("removeTextNode", () => {
    it("removes an existing node", () => {
      const canvas = new PretextCanvas(defaultOpts);
      canvas.addTextNode("n1", "Hello", 10, 20, 200);

      expect(canvas.removeTextNode("n1")).toBe(true);
      expect(canvas.getTextNode("n1")).toBeNull();
    });

    it("returns false for missing node", () => {
      const canvas = new PretextCanvas(defaultOpts);
      expect(canvas.removeTextNode("missing")).toBe(false);
    });
  });

  describe("updateTextNode", () => {
    it("updates text and re-measures", () => {
      const canvas = new PretextCanvas(defaultOpts);
      canvas.addTextNode("n1", "Short", 0, 0, 200);

      const newBounds = canvas.updateTextNode(
        "n1",
        "This is a much longer piece of text that should wrap"
      );
      expect(newBounds).not.toBeNull();
      expect(newBounds!.lineCount).toBeGreaterThanOrEqual(1);

      const node = canvas.getTextNode("n1");
      expect(node!.text).toBe(
        "This is a much longer piece of text that should wrap"
      );
    });

    it("returns null for missing node", () => {
      const canvas = new PretextCanvas(defaultOpts);
      expect(canvas.updateTextNode("missing", "text")).toBeNull();
    });
  });

  describe("moveTextNode", () => {
    it("moves without re-measuring", () => {
      const canvas = new PretextCanvas(defaultOpts);
      canvas.addTextNode("n1", "Hello", 10, 20, 200);
      const origBounds = canvas.getTextNodeBounds("n1");

      expect(canvas.moveTextNode("n1", 500, 600)).toBe(true);

      const node = canvas.getTextNode("n1");
      expect(node!.x).toBe(500);
      expect(node!.y).toBe(600);
      expect(node!.bounds).toEqual(origBounds);
    });

    it("returns false for missing node", () => {
      const canvas = new PretextCanvas(defaultOpts);
      expect(canvas.moveTextNode("missing", 0, 0)).toBe(false);
    });
  });

  describe("viewport", () => {
    it("defaults to origin with zoom=1", () => {
      const canvas = new PretextCanvas(defaultOpts);
      expect(canvas.getViewport()).toEqual({ x: 0, y: 0, zoom: 1 });
    });

    it("can be set", () => {
      const canvas = new PretextCanvas(defaultOpts);
      canvas.setViewport(100, 200, 0.5);
      expect(canvas.getViewport()).toEqual({ x: 100, y: 200, zoom: 0.5 });
    });
  });

  describe("getVisibleNodes", () => {
    it("returns only nodes in viewport", () => {
      const canvas = new PretextCanvas(defaultOpts);
      canvas.addTextNode("visible", "In view", 100, 100, 200);
      canvas.addTextNode("offscreen", "Far away", 5000, 5000, 200);

      const visible = canvas.getVisibleNodes();
      const ids = visible.map((n) => n.id);
      expect(ids).toContain("visible");
      expect(ids).not.toContain("offscreen");
    });

    it("updates when viewport pans", () => {
      const canvas = new PretextCanvas(defaultOpts);
      canvas.addTextNode("a", "Text A", 100, 100, 200);
      canvas.addTextNode("b", "Text B", 2000, 2000, 200);

      // Initially only a is visible
      expect(canvas.getVisibleNodes().map((n) => n.id)).toContain("a");

      // Pan to see b
      canvas.setViewport(1900, 1900, 1);
      const visible = canvas.getVisibleNodes();
      const ids = visible.map((n) => n.id);
      expect(ids).toContain("b");
      expect(ids).not.toContain("a");
    });
  });

  describe("hitTest", () => {
    it("finds node at click position", () => {
      const canvas = new PretextCanvas(defaultOpts);
      canvas.addTextNode("n1", "Click me", 100, 100, 200);

      // Click inside the node area
      const result = canvas.hitTest(150, 110);
      expect(result).not.toBeNull();
      expect(result!.nodeId).toBe("n1");
    });

    it("returns null for empty area", () => {
      const canvas = new PretextCanvas(defaultOpts);
      canvas.addTextNode("n1", "Click me", 100, 100, 200);

      const result = canvas.hitTest(700, 500);
      expect(result).toBeNull();
    });
  });

  describe("getNodeIds", () => {
    it("returns all node IDs", () => {
      const canvas = new PretextCanvas(defaultOpts);
      canvas.addTextNode("a", "A", 0, 0, 100);
      canvas.addTextNode("b", "B", 100, 0, 100);

      expect(canvas.getNodeIds().sort()).toEqual(["a", "b"]);
    });
  });

  describe("toJSON / fromJSON", () => {
    it("round-trips canvas state", () => {
      const canvas = new PretextCanvas(defaultOpts);
      canvas.addTextNode("n1", "Hello", 10, 20, 200, { color: "#f00" });
      canvas.addTextNode("n2", "World", 300, 400, 150);
      canvas.setViewport(50, 75, 1.5);

      const json = canvas.toJSON();

      expect(json.version).toBe(1);
      expect(json.viewport).toEqual({ x: 50, y: 75, zoom: 1.5 });
      expect(json.nodes).toHaveLength(2);

      // Restore into a fresh canvas
      const canvas2 = new PretextCanvas(defaultOpts);
      canvas2.fromJSON(json);

      expect(canvas2.getViewport()).toEqual({ x: 50, y: 75, zoom: 1.5 });
      expect(canvas2.getNodeIds()).toEqual(["n1", "n2"]);

      const n1 = canvas2.getTextNode("n1");
      expect(n1!.text).toBe("Hello");
      expect(n1!.x).toBe(10);
      expect(n1!.style?.color).toBe("#f00");
    });
  });
});
