import {
  useLayoutEffect,
  useCallback,
  useState,
  RefObject,
  useRef,
  useEffect,
} from 'react';
import { useWindowDimensions } from '..';

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
  ref: RefObject<T>
): DOMRect => {
  const [rect, setRect] = useState(getRect(ref ? ref.current : null));
  const { height, width } = useWindowDimensions();

  const resize = useCallback(() => {
    if (!ref.current) return;
    setRect(getRect(ref.current));
  }, [ref]);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    resize();
  }, [height, width]);

  return rect;
};

export const useBoundingClientRectRef = <T extends HTMLElement>(
  callback: (rect: DOMRect) => void
): { ref: RefObject<T>; rect: DOMRect } => {
  const ref = useRef<T>(null);

  const rect = useBoundingClientRect<T>(ref);

  useEffect(() => {
    callback(rect);
  }, [rect]);

  return { ref, rect };
};
