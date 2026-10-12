/*
 * The collapsed rail's flyout corridor (spec/chrome § collapsed rail,
 * OMS-REG-FTR-02.29): the stretch between a rail button and its open flyout.
 * Pure geometry — MenuBar reads the two boxes and the pointer, and holds the
 * flyout's close timer off while this says the pointer is inside it.
 */

/** The edges of a box in viewport pixels — a DOMRect satisfies it. */
export interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Is the point between the anchor (the rail button) and the panel — the
 * rail's own padding, its edge strip, and the gap past it — and level with
 * them, anywhere from the higher of their tops to the lower of their bottoms
 * (a panel pushed up a short window can sit well above its button, and the
 * way up to it counts too)? The pointer crossing that stretch has left the
 * button but not reached the panel, so a slow crossing or a pause on the way
 * would otherwise close the flyout.
 *
 * The facing edges are the min/max of the two boxes, so the same test holds
 * whichever side the panel opens on (right in LTR, left in RTL). Inside the
 * anchor or the panel is NOT between them — those have their own hover.
 */
export const isBetweenAnchorAndPanel = (
  anchor: Box,
  panel: Box,
  point: { x: number; y: number }
): boolean =>
  point.x >= Math.min(anchor.right, panel.right) &&
  point.x <= Math.max(anchor.left, panel.left) &&
  point.y >= Math.min(anchor.top, panel.top) &&
  point.y <= Math.max(anchor.bottom, panel.bottom);
