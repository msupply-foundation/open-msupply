import { useLayoutEffect, useRef } from 'react';
import { useFlashEnabled, useMetrics } from '@/benchmark/metrics/metricsContext';

/*
 * The manual render registry (BENCHMARK.md §"Render counts"). Attach the returned
 * ref to a tracked component's root: on every commit it (1) ticks the pane's render
 * counter and (2) flashes the element's outline when render-flash is on.
 *
 * Counting happens in a LAYOUT effect, not a passive one: it runs synchronously with
 * the commit, inside the same task as the interaction that caused it. That makes the
 * count StrictMode-robust (StrictMode double-invokes render but commits once) and
 * guarantees the interaction's renders are all counted before the next frame snapshots
 * them. The flash also lands pre-paint, so it's visible on the same frame.
 */
const FLASH_MS = 350;

export const useRenderTracker = <T extends HTMLElement = HTMLDivElement>() => {
  const controller = useMetrics();
  const flashEnabled = useFlashEnabled();
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    controller.tickRender();

    const element = ref.current;
    if (!element) return;

    if (!flashEnabled) {
      element.removeAttribute('data-flash');
      return;
    }

    element.setAttribute('data-flash', 'on');
    const timer = window.setTimeout(() => element.removeAttribute('data-flash'), FLASH_MS);
    return () => window.clearTimeout(timer);
  });

  return ref;
};
