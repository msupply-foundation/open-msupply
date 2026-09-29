import type { TemperatureLogRowFragment } from '../monitoring.generated';

// The temperature chart's data shaping (spec/cold-chain-monitoring rules › the
// chart), framework-free so the per-sensor series, the one-marker-per-breach
// rule, the tooltip's readings-at-a-moment and the truncation test are
// unit-testable in node. The component (TemperatureChart.tsx) only draws what
// these produce.

export type ChartPoint = {
  /** Epoch milliseconds. */
  time: number;
  temperature: number;
  /** The breach this reading belongs to, where it belongs to one. */
  breachId: string | null;
  logId: string;
};

export type SensorSeries = {
  sensorId: string;
  name: string;
  /** Ascending by time. */
  points: ChartPoint[];
};

/**
 * One line per sensor (rules › the chart). A reading whose sensor is null is
 * dropped entirely — it has no line to sit on (contract › the chart). Series
 * are ordered by sensor name so the legend and the colour assignment are
 * stable across refetches, and each series' points are ordered by time
 * whatever order the wire returned.
 */
export const buildSeries = (
  logs: TemperatureLogRowFragment[]
): SensorSeries[] => {
  const bySensor = new Map<string, SensorSeries>();
  for (const log of logs) {
    if (!log.sensor) continue;
    const series = bySensor.get(log.sensor.id) ?? {
      sensorId: log.sensor.id,
      name: log.sensor.name,
      points: [],
    };
    series.points.push({
      time: Date.parse(log.datetime),
      temperature: log.temperature,
      breachId: log.temperatureBreach?.id ?? null,
      logId: log.id,
    });
    bySensor.set(log.sensor.id, series);
  }
  const series = [...bySensor.values()];
  for (const s of series) s.points.sort((a, b) => a.time - b.time);
  return series.sort((a, b) => a.name.localeCompare(b.name));
};

export type BreachMarker = {
  breachId: string;
  sensorId: string;
  sensorName: string;
  time: number;
  temperature: number;
};

/**
 * The reading that BEGINS each breach run — one marker per breach, not one
 * per reading (rules › the chart; `.6`). Nothing on the wire marks a run's
 * first reading (contract › the chart): walking each sensor's readings in
 * time order, a reading opens a run when its breach differs from the one the
 * previous reading belonged to. A reading with no breach closes the run, so a
 * later run of the same breach id marks again — and a different breach
 * immediately following one closes the first and opens the second.
 */
export const breachMarkers = (series: SensorSeries[]): BreachMarker[] => {
  const markers: BreachMarker[] = [];
  for (const s of series) {
    let current: string | null = null;
    for (const point of s.points) {
      if (point.breachId !== null && point.breachId !== current)
        markers.push({
          breachId: point.breachId,
          sensorId: s.sensorId,
          sensorName: s.name,
          time: point.time,
          temperature: point.temperature,
        });
      current = point.breachId;
    }
  }
  return markers;
};

/**
 * Whether the window held more readings than the chart requested (rules › the
 * chart): the server reports no truncation of its own, so it is the
 * connector's total against the rows received (contract › the chart).
 */
export const isTruncated = (totalCount: number, received: number): boolean =>
  totalCount > received;

/**
 * A series' points split into the runs a line may join. A gap wider than
 * `gapFactor` times the sensor's typical interval (the median of its own
 * gaps) breaks the line, so missing readings read as a break rather than
 * being interpolated across (ui-surface T1). A sensor with a single reading
 * is one run of one point.
 */
export const lineSegments = (
  points: ChartPoint[],
  gapFactor = 3
): ChartPoint[][] => {
  if (points.length < 2) return points.length ? [points] : [];
  const gaps = points
    .slice(1)
    .map((p, i) => p.time - points[i]!.time)
    .sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)] ?? 0;
  const limit = median * gapFactor;
  const segments: ChartPoint[][] = [];
  let run: ChartPoint[] = [points[0]!];
  for (let i = 1; i < points.length; i++) {
    const point = points[i]!;
    if (limit > 0 && point.time - points[i - 1]!.time > limit) {
      segments.push(run);
      run = [];
    }
    run.push(point);
  }
  segments.push(run);
  return segments;
};

export type TooltipReading = {
  sensorId: string;
  name: string;
  temperature: number;
  time: number;
};

export type TooltipMoment = {
  /** The moment identified — the reading nearest the hovered time. */
  time: number;
  /** Every sensor's reading at that moment, in series order. */
  readings: TooltipReading[];
};

/**
 * Hovering a point identifies the moment and every sensor's reading at it
 * (rules › the chart; `.2`–`.5`). The moment is the reading nearest the
 * hovered time across all sensors; each sensor contributes its own nearest
 * reading provided it lies within `tolerance` of that moment — sensors on
 * different schedules rarely share an exact timestamp. Undefined when no
 * reading is within `tolerance` of the hovered time at all.
 */
export const readingsAt = (
  series: SensorSeries[],
  hoveredTime: number,
  tolerance: number
): TooltipMoment | undefined => {
  const nearestOf = (points: ChartPoint[], time: number) => {
    // Binary search on the time-ordered points for the neighbour pair.
    let lo = 0;
    let hi = points.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (points[mid]!.time < time) lo = mid + 1;
      else hi = mid;
    }
    const after = points[lo];
    const before = points[lo - 1];
    if (!after) return before;
    if (!before) return after;
    return time - before.time <= after.time - time ? before : after;
  };

  let moment: ChartPoint | undefined;
  for (const s of series) {
    const nearest = nearestOf(s.points, hoveredTime);
    if (!nearest) continue;
    if (
      !moment ||
      Math.abs(nearest.time - hoveredTime) < Math.abs(moment.time - hoveredTime)
    )
      moment = nearest;
  }
  if (!moment || Math.abs(moment.time - hoveredTime) > tolerance)
    return undefined;

  const at = moment.time;
  const readings: TooltipReading[] = [];
  for (const s of series) {
    const nearest = nearestOf(s.points, at);
    if (nearest && Math.abs(nearest.time - at) <= tolerance)
      readings.push({
        sensorId: s.sensorId,
        name: s.name,
        temperature: nearest.temperature,
        time: nearest.time,
      });
  }
  return { time: at, readings };
};

/**
 * The chart's two threshold bands are FIXED presentation constants — the
 * ordinary vaccine range — not the store's configured breach thresholds,
 * which no query exposes (rules › the chart; contract ⚠️ wire trap). Every
 * store sees the same two bands.
 */
export const COLD_THRESHOLD = 2;
export const HOT_THRESHOLD = 8;

/**
 * The vertical domain: the readings' range widened to always include both
 * thresholds (so the bands are always visible) plus a margin, and never
 * degenerate. Snapped to whole degrees.
 */
export const temperatureDomain = (
  series: SensorSeries[]
): { min: number; max: number } => {
  let min = COLD_THRESHOLD;
  let max = HOT_THRESHOLD;
  for (const s of series)
    for (const p of s.points) {
      if (p.temperature < min) min = p.temperature;
      if (p.temperature > max) max = p.temperature;
    }
  const margin = Math.max(1, (max - min) * 0.1);
  return { min: Math.floor(min - margin), max: Math.ceil(max + margin) };
};

/** The time range the readings span, or undefined when there are none. */
export const timeExtent = (
  series: SensorSeries[]
): { start: number; end: number } | undefined => {
  let start = Infinity;
  let end = -Infinity;
  for (const s of series)
    for (const p of s.points) {
      if (p.time < start) start = p.time;
      if (p.time > end) end = p.time;
    }
  return start <= end ? { start, end } : undefined;
};

/**
 * Whole-degree ticks across a domain at a step that yields roughly `count`
 * of them (1, 2, 5, 10 …), always including the two thresholds so the axis
 * emphasises them (ui-surface T1).
 */
export const temperatureTicks = (
  domain: { min: number; max: number },
  count = 6
): number[] => {
  const span = Math.max(1, domain.max - domain.min);
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / magnitude;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * magnitude;
  const ticks = new Set<number>([COLD_THRESHOLD, HOT_THRESHOLD]);
  for (
    let t = Math.ceil(domain.min / step) * step;
    t <= domain.max + step / 1000;
    t += step
  )
    ticks.add(Number(t.toFixed(6)));
  return [...ticks]
    .filter(t => t >= domain.min && t <= domain.max)
    .sort((a, b) => a - b);
};

/**
 * Evenly spaced time ticks across a window (roughly `count`), as epoch
 * milliseconds — the horizontal axis (ui-surface T1).
 */
export const timeTicks = (
  window: { start: number; end: number },
  count = 6
): number[] => {
  if (window.end <= window.start) return [window.start];
  const step = (window.end - window.start) / count;
  return Array.from({ length: count + 1 }, (_, i) =>
    Math.round(window.start + i * step)
  );
};
