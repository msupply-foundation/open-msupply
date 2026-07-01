import { useEffect } from 'react';
import type { MetricsController } from '@/benchmark/metrics/metricsController';

/*
 * Counts long tasks (>50 ms of blocked main thread) via PerformanceObserver — these
 * are what the naive tier racks up under load and what "feels janky" maps to.
 * `longtask` is unsupported in some browsers (e.g. Safari); we degrade silently.
 */
export const useLongTasks = (controller: MetricsController): void => {
  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      const count = list.getEntries().length;
      for (let i = 0; i < count; i++) controller.recordLongTask();
    });

    try {
      observer.observe({ type: 'longtask', buffered: true });
    } catch {
      return;
    }
    return () => observer.disconnect();
  }, [controller]);
};
