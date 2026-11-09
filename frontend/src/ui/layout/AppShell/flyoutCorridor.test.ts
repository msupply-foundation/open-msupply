import { describe, expect, it } from 'vitest';
import { isBetweenAnchorAndPanel, type Box } from './flyoutCorridor';

// The collapsed rail's flyout stays open while the pointer is between its
// icon and the panel (spec/chrome § collapsed rail, OMS-REG-FTR-02.29). Boxes
// are the rendered geometry at 1280px: an 80px rail, its button inset 8px,
// the panel 12px past the rail's edge.
const anchor: Box = { left: 8, right: 72, top: 180, bottom: 220 };
const panel: Box = { left: 92, right: 292, top: 180, bottom: 391 };
const between = (x: number, y: number, a = anchor, p = panel) =>
  isBetweenAnchorAndPanel(a, p, { x, y });

// The same layout in RTL: the rail on the right, the panel opening left.
const WIDTH = 1280;
const mirror = (b: Box): Box => ({
  ...b,
  left: WIDTH - b.right,
  right: WIDTH - b.left,
});

describe('isBetweenAnchorAndPanel', () => {
  it("holds across the rail's padding, its edge strip, and the gap", () => {
    expect(between(74, 200)).toBe(true); // rail padding
    expect(between(78, 200)).toBe(true); // edge strip
    expect(between(85, 200)).toBe(true); // gap past the rail
  });

  it('holds level with the panel below the icon (a slow diagonal)', () => {
    expect(between(75, 380)).toBe(true);
  });

  it('does not hold above or below both boxes', () => {
    expect(between(75, 170)).toBe(false);
    expect(between(75, 400)).toBe(false);
  });

  it('does not hold inside the icon or the panel, or beyond either', () => {
    expect(between(40, 200)).toBe(false); // on the icon
    expect(between(150, 200)).toBe(false); // on the panel
    expect(between(4, 200)).toBe(false); // the icon's far side
    expect(between(300, 200)).toBe(false); // past the panel
  });

  it('holds on the way up to a panel pushed above its icon', () => {
    // A tall flyout clamped to a short window sits well above its button.
    const low: Box = { left: 8, right: 72, top: 600, bottom: 640 };
    const high: Box = { left: 92, right: 292, top: 8, bottom: 380 };
    expect(between(75, 620, low, high)).toBe(true); // level with the icon
    expect(between(75, 500, low, high)).toBe(true); // on the way up
    expect(between(75, 100, low, high)).toBe(true); // level with the panel
    expect(between(75, 700, low, high)).toBe(false); // below both
  });

  it('mirrors in RTL, where the panel opens to the left', () => {
    const a = mirror(anchor);
    const p = mirror(panel);
    expect(between(WIDTH - 74, 200, a, p)).toBe(true); // rail padding
    expect(between(WIDTH - 85, 200, a, p)).toBe(true); // gap past the rail
    expect(between(WIDTH - 40, 200, a, p)).toBe(false); // on the icon
    expect(between(WIDTH - 150, 200, a, p)).toBe(false); // on the panel
    expect(between(WIDTH - 74, 400, a, p)).toBe(false); // below both
  });
});
