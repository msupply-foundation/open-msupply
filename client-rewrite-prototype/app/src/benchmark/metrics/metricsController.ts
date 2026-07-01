import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';

/*
 * Per-pane metrics engine. Separate from React state on purpose: render counts are
 * accumulated in plain mutable counters and flushed to a Zustand store once per
 * animation frame, so a keystroke storm can't churn the HUD, and the HUD's own
 * renders never pollute the numbers it reports.
 *
 * Every metric here is production-build safe — no reliance on <Profiler> or dev-only
 * internals (see BENCHMARK.md §"How each metric is captured").
 */
export interface MetricsState {
  /** Renders committed during the most recent interaction (the headline number). */
  lastInteractionRenders: number;
  /** Renders committed since the last reset. */
  totalRenders: number;
  /** Duration of the most recent interaction event (ms). */
  lastInp: number;
  /** Running p95 / max interaction latency (ms). */
  inpP95: number;
  inpMax: number;
  /** Live frames-per-second. */
  fps: number;
  /** Count of long tasks (>50 ms) since reset. */
  longTasks: number;
}

export interface MetricsController {
  store: StoreApi<MetricsState>;
  /** Called from every tracked component's commit (via useRenderTracker). */
  tickRender: () => void;
  /** Called at the start of a user interaction (before the resulting renders). */
  beginInteraction: () => void;
  recordInp: (ms: number) => void;
  recordLongTask: () => void;
  reset: () => void;
  /** Start/stop the flush loop. Driven by an effect so it survives StrictMode's
   *  mount→unmount→remount probe (start → stop → start) without freezing. */
  start: () => void;
  stop: () => void;
}

const INITIAL: MetricsState = {
  lastInteractionRenders: 0,
  totalRenders: 0,
  lastInp: 0,
  inpP95: 0,
  inpMax: 0,
  fps: 0,
  longTasks: 0,
};

const FPS_WINDOW_MS = 500;
const MAX_INP_SAMPLES = 300;

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
};

export const createMetricsController = (): MetricsController => {
  const store = createStore<MetricsState>(() => ({ ...INITIAL }));

  let pendingRenders = 0;
  let interactionRenders = 0;
  let settlePending = false;
  const inpSamples: number[] = [];

  let frames = 0;
  let windowStart = 0;
  let lastFps = 0;
  let rafId = 0;
  let running = false;

  const frame = (time: number): void => {
    if (!running) return;

    if (windowStart === 0) windowStart = time;
    frames += 1;

    const patch: Partial<MetricsState> = {};
    let changed = false;

    // Interactions commit their renders synchronously (useRenderTracker uses a
    // layout effect), so by the time any frame runs, the count for the just-fired
    // interaction is complete — snapshot it here.
    if (settlePending) {
      patch.lastInteractionRenders = interactionRenders;
      settlePending = false;
      changed = true;
    }
    if (pendingRenders > 0) {
      patch.totalRenders = store.getState().totalRenders + pendingRenders;
      pendingRenders = 0;
      changed = true;
    }
    if (time - windowStart >= FPS_WINDOW_MS) {
      lastFps = Math.round((frames * 1000) / (time - windowStart));
      frames = 0;
      windowStart = time;
      patch.fps = lastFps;
      changed = true;
    }
    if (changed) store.setState(patch);

    rafId = requestAnimationFrame(frame);
  };

  return {
    store,
    tickRender: () => {
      pendingRenders += 1;
      interactionRenders += 1;
    },
    beginInteraction: () => {
      interactionRenders = 0;
      settlePending = true;
    },
    recordInp: (ms) => {
      inpSamples.push(ms);
      if (inpSamples.length > MAX_INP_SAMPLES) inpSamples.shift();
      const sorted = [...inpSamples].sort((a, b) => a - b);
      store.setState({
        lastInp: ms,
        inpP95: percentile(sorted, 95),
        inpMax: sorted[sorted.length - 1],
      });
    },
    recordLongTask: () => {
      store.setState((state) => ({ longTasks: state.longTasks + 1 }));
    },
    reset: () => {
      pendingRenders = 0;
      interactionRenders = 0;
      settlePending = false;
      inpSamples.length = 0;
      store.setState({ ...INITIAL, fps: lastFps });
    },
    start: () => {
      if (running) return;
      running = true;
      windowStart = 0;
      frames = 0;
      rafId = requestAnimationFrame(frame);
    },
    stop: () => {
      running = false;
      cancelAnimationFrame(rafId);
    },
  };
};
