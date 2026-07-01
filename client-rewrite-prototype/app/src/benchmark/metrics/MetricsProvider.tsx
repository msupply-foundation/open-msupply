import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createMetricsController } from './metricsController';
import type { MetricsController } from './metricsController';
import { MetricsContext } from './metricsContext';
import { useInp } from '@/benchmark/hud/useInp';
import { useLongTasks } from '@/benchmark/hud/useLongTasks';

/*
 * Owns one metrics controller for its subtree and wires up the page-level
 * PerformanceObservers (event-timing INP, long tasks). The controller lives in a
 * ref so it survives re-renders; its flush loop is started/stopped by an effect, so
 * StrictMode's mount→unmount→remount probe (start → stop → start) leaves it running.
 */
export const MetricsProvider = ({ children }: { children: ReactNode }) => {
  const ref = useRef<MetricsController | null>(null);
  if (ref.current === null) ref.current = createMetricsController();
  const controller = ref.current;

  useEffect(() => {
    controller.start();
    return () => controller.stop();
  }, [controller]);

  useInp(controller);
  useLongTasks(controller);

  return (
    <MetricsContext.Provider value={controller}>
      {children}
    </MetricsContext.Provider>
  );
};
