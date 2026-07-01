import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { MetricsController, MetricsState } from './metricsController';

/*
 * Metrics + flash state are scoped PER PANE (not global) so the side-by-side demo
 * shows two independent stories at once. Kept in a hook-free module (the provider
 * component lives in MetricsProvider.tsx) to keep Fast Refresh happy.
 */
export const MetricsContext = createContext<MetricsController | null>(null);

/** Render-flash on/off — a rarely-changing control, so a plain context (not the
 *  metrics store) avoids giving every tracked component a store subscription. */
export const FlashContext = createContext<boolean>(true);

export const useMetrics = (): MetricsController => {
  const controller = useContext(MetricsContext);
  if (!controller) {
    throw new Error('useMetrics must be used within a <MetricsProvider>');
  }
  return controller;
};

export const useMetricsState = <T>(selector: (state: MetricsState) => T): T => {
  const controller = useMetrics();
  return useStore(controller.store, selector);
};

export const useFlashEnabled = (): boolean => useContext(FlashContext);
