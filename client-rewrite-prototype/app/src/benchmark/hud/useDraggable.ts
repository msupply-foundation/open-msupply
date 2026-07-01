import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

/*
 * Minimal pointer-driven drag for the floating HUD. Pointer capture keeps the drag
 * tracking even when the pointer leaves the small drag handle. Position is `fixed`
 * viewport coordinates, applied by the HUD as inline `left`/`top`.
 */
export interface Point {
  x: number;
  y: number;
}

export const useDraggable = (initial: Point) => {
  const [pos, setPos] = useState<Point>(initial);
  const offset = useRef<Point | null>(null);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent) => {
      offset.current = { x: event.clientX - pos.x, y: event.clientY - pos.y };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [pos.x, pos.y]
  );

  const onPointerMove = useCallback((event: ReactPointerEvent) => {
    const start = offset.current;
    if (!start) return;
    setPos({ x: event.clientX - start.x, y: event.clientY - start.y });
  }, []);

  const onPointerUp = useCallback((event: ReactPointerEvent) => {
    offset.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  return { pos, dragHandleProps: { onPointerDown, onPointerMove, onPointerUp } };
};
