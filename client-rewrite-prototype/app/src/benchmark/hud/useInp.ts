import { useEffect } from 'react';
import type { MetricsController } from '@/benchmark/metrics/metricsController';

/*
 * Interaction latency via the browser's Event Timing API — the same signal
 * Lighthouse's INP is built on, which is what makes the numbers credible. We record
 * the duration of entries that carry an `interactionId` (the real user interactions
 * INP counts), and derive p95 / max in the controller.
 *
 * `interactionId` / `durationThreshold` aren't in the TS DOM lib yet, so both are
 * described locally.
 */
interface EventTimingEntry extends PerformanceEntry {
  duration: number;
  interactionId?: number;
}

export const useInp = (controller: MetricsController): void => {
  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const timing = entry as EventTimingEntry;
        if (timing.interactionId && timing.interactionId > 0) {
          controller.recordInp(timing.duration);
        }
      }
    });

    try {
      observer.observe({
        type: 'event',
        durationThreshold: 0,
        buffered: true,
      } as PerformanceObserverInit);
    } catch {
      return;
    }
    return () => observer.disconnect();
  }, [controller]);
};
