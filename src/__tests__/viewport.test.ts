import { describe, it, expect } from "vitest";
import { Viewport } from "../viewport.js";

describe("Viewport", () => {
  it("initializes with default state", () => {
    const vp = new Viewport(800, 600);
    expect(vp.get()).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it("sets position and zoom", () => {
    const vp = new Viewport(800, 600);
    vp.set(100, 200, 2);
    expect(vp.get()).toEqual({ x: 100, y: 200, zoom: 2 });
  });

  it("clamps zoom to [0.01, 100]", () => {
    const vp = new Viewport(800, 600);

    vp.set(0, 0, 0.001);
    expect(vp.get().zoom).toBe(0.01);

    vp.set(0, 0, 500);
    expect(vp.get().zoom).toBe(100);

    vp.set(0, 0, -5);
    expect(vp.get().zoom).toBe(0.01);
  });

  describe("worldToScreen", () => {
    it("converts at zoom=1 with no pan", () => {
      const vp = new Viewport(800, 600);
      expect(vp.worldToScreen(50, 100)).toEqual({ x: 50, y: 100 });
    });

    it("applies pan offset", () => {
      const vp = new Viewport(800, 600);
      vp.set(100, 50, 1);
      // screen = (world - viewport) * zoom
      expect(vp.worldToScreen(150, 100)).toEqual({ x: 50, y: 50 });
    });

    it("applies zoom", () => {
      const vp = new Viewport(800, 600);
      vp.set(0, 0, 2);
      expect(vp.worldToScreen(50, 100)).toEqual({ x: 100, y: 200 });
    });

    it("applies both pan and zoom", () => {
      const vp = new Viewport(800, 600);
      vp.set(10, 20, 3);
      // screen = (world - viewport) * zoom
      expect(vp.worldToScreen(20, 30)).toEqual({ x: 30, y: 30 });
    });
  });

  describe("screenToWorld", () => {
    it("is the inverse of worldToScreen", () => {
      const vp = new Viewport(800, 600);
      vp.set(50, 75, 2.5);

      const worldPt = { x: 200, y: 300 };
      const screen = vp.worldToScreen(worldPt.x, worldPt.y);
      const backToWorld = vp.screenToWorld(screen.x, screen.y);

      expect(backToWorld.x).toBeCloseTo(worldPt.x, 10);
      expect(backToWorld.y).toBeCloseTo(worldPt.y, 10);
    });
  });

  describe("getVisibleBounds", () => {
    it("returns full canvas at zoom=1 no pan", () => {
      const vp = new Viewport(800, 600);
      expect(vp.getVisibleBounds()).toEqual({
        minX: 0,
        minY: 0,
        maxX: 800,
        maxY: 600,
      });
    });

    it("shrinks visible area at higher zoom", () => {
      const vp = new Viewport(800, 600);
      vp.set(0, 0, 2);
      expect(vp.getVisibleBounds()).toEqual({
        minX: 0,
        minY: 0,
        maxX: 400,
        maxY: 300,
      });
    });

    it("offsets visible area by pan", () => {
      const vp = new Viewport(800, 600);
      vp.set(100, 200, 1);
      expect(vp.getVisibleBounds()).toEqual({
        minX: 100,
        minY: 200,
        maxX: 900,
        maxY: 800,
      });
    });
  });

  describe("scale conversions", () => {
    it("worldToScreenScale multiplies by zoom", () => {
      const vp = new Viewport(800, 600);
      vp.set(0, 0, 3);
      expect(vp.worldToScreenScale(10)).toBe(30);
    });

    it("screenToWorldScale divides by zoom", () => {
      const vp = new Viewport(800, 600);
      vp.set(0, 0, 4);
      expect(vp.screenToWorldScale(100)).toBe(25);
    });
  });

  it("resize changes visible bounds", () => {
    const vp = new Viewport(800, 600);
    vp.resize(1600, 1200);
    expect(vp.getVisibleBounds()).toEqual({
      minX: 0,
      minY: 0,
      maxX: 1600,
      maxY: 1200,
    });
  });
});
