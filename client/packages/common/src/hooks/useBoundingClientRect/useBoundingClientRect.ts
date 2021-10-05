import { useDebounceCallback } from './../useDebounce/useDebounceCallback';
import { useState, RefObject, useRef, useEffect } from 'react';

const getRect = (element: HTMLElement | null): DOMRect => {
  if (!element) {
    return {
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: function () {
        return this;
      },
    };
  }

  return element.getBoundingClientRect();
};

export const useBoundingClientRect = <T extends HTMLElement>(
  ref: RefObject<T>,
  debouncedTimer = 500
): DOMRect => {
  const [rect, setRect] = useState(
    getRect(ref && ref.current ? ref.current : null)
  );

  const observer = useRef<ResizeObserver | null>(null);

  const resize = useDebounceCallback(
    () => {
      if (!ref.current) return;
      setRect(getRect(ref.current));
    },
    [ref],
    debouncedTimer
  );

  useEffect(() => {
    if (!ref.current) return;

    observer.current = new ResizeObserver(resize);
    observer.current.observe(ref.current);

    return () => {
      observer.current?.disconnect();
    };
  }, []);

  return rect;
};

export const useBoundingClientRectRef = <T extends HTMLElement>(
  callback?: (rect: DOMRect) => void
): { ref: RefObject<T>; rect: DOMRect } => {
  const ref = useRef<T>(null);
  const rect = useBoundingClientRect<T>(ref);

  useEffect(() => {
    callback?.(rect);
  }, [rect]);

  return { ref, rect };
};
