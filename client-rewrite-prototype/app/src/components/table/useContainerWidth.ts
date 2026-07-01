import { useEffect, useState, type RefObject } from 'react';

/*
 * Reports an element's content width via ResizeObserver. The card view switches
 * on the TABLE's own width (which changes as the nav docks/undocks), not the
 * viewport — the container-query principle from the responsive decision, but in
 * JS because we swap MARKUP (table ↔ card list), which CSS alone can't do.
 */
export function useContainerWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return width;
}
