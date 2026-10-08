import { describe, expect, it } from 'vitest';
import type { TemperatureLogRowFragment } from '../monitoring.generated';
import {
  COLD_THRESHOLD,
  HOT_THRESHOLD,
  breachMarkers,
  buildSeries,
  isTruncated,
  lineSegments,
  readingsAt,
  temperatureDomain,
  temperatureTicks,
  timeExtent,
  timeTicks,
} from './chartData';

// The chart's data shaping (spec/cold-chain-monitoring rules › the chart), at
// the logic level: what is plotted, what is marked, what the tooltip says.
// Anchors: spec/cold-chain-monitoring/cases/OMS-REG-CCE-02.

const T0 = Date.parse('2026-09-08T00:00:00.000Z');
const MIN = 60_000;

const log = (
  over: Partial<TemperatureLogRowFragment> & { at: number; temp: number }
): TemperatureLogRowFragment => ({
  __typename: 'TemperatureLogNode',
  id: over.id ?? `log-${over.at}`,
  datetime: new Date(T0 + over.at * MIN).toISOString(),
  temperature: over.temp,
  sensorId: over.sensorId ?? 'sensor-a',
  sensor:
    over.sensor === undefined
      ? { id: over.sensorId ?? 'sensor-a', name: 'Fridge A' }
      : over.sensor,
  location: over.location ?? null,
  temperatureBreach: over.temperatureBreach ?? null,
});

describe('OMS-REG-CCE-02.1 — one line per sensor, from every connected sensor', () => {
  it('groups readings into one series per sensor, ordered by name', () => {
    const series = buildSeries([
      log({ at: 0, temp: 4, sensorId: 'b', sensor: { id: 'b', name: 'Zeta' } }),
      log({ at: 0, temp: 5 }),
      log({ at: 15, temp: 5.5 }),
    ]);
    expect(series.map(s => s.name)).toEqual(['Fridge A', 'Zeta']);
    expect(series[0]?.points.map(p => p.temperature)).toEqual([5, 5.5]);
  });

  it('orders each series by time whatever order the wire returned', () => {
    const series = buildSeries([
      log({ at: 30, temp: 6 }),
      log({ at: 0, temp: 4 }),
      log({ at: 15, temp: 5 }),
    ]);
    expect(series[0]?.points.map(p => p.temperature)).toEqual([4, 5, 6]);
  });

  it('drops a reading whose sensor is null — it has no line to sit on', () => {
    const series = buildSeries([
      log({ at: 0, temp: 4 }),
      log({ at: 15, temp: 5, sensor: null }),
    ]);
    expect(series).toHaveLength(1);
    expect(series[0]?.points).toHaveLength(1);
  });
});

describe('OMS-REG-CCE-02.6 — one marker per breach, at the reading that begins it', () => {
  const breach = (id: string) => ({ id, type: 'HOT_CUMULATIVE' as const });

  it('marks the first reading of a run and none of the readings that follow', () => {
    const series = buildSeries([
      log({ at: 0, temp: 5 }),
      log({ at: 15, temp: 9, temperatureBreach: breach('b1') }),
      log({ at: 30, temp: 10, temperatureBreach: breach('b1') }),
      log({ at: 45, temp: 9.5, temperatureBreach: breach('b1') }),
      log({ at: 60, temp: 6 }),
    ]);
    const markers = breachMarkers(series);
    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({
      breachId: 'b1',
      sensorName: 'Fridge A',
      time: T0 + 15 * MIN,
      temperature: 9,
    });
  });

  it('marks again when a sensor returns to normal and breaches again', () => {
    const series = buildSeries([
      log({ at: 0, temp: 9, temperatureBreach: breach('b1') }),
      log({ at: 15, temp: 5 }),
      log({ at: 30, temp: 9, temperatureBreach: breach('b2') }),
      log({ at: 45, temp: 9, temperatureBreach: breach('b2') }),
    ]);
    expect(breachMarkers(series).map(m => m.breachId)).toEqual(['b1', 'b2']);
  });

  it('marks a different breach immediately following one', () => {
    const series = buildSeries([
      log({ at: 0, temp: 9, temperatureBreach: breach('b1') }),
      log({ at: 15, temp: 9, temperatureBreach: breach('b2') }),
    ]);
    expect(breachMarkers(series).map(m => m.breachId)).toEqual(['b1', 'b2']);
  });

  it('marks per sensor — two sensors in one breach run each carry a marker', () => {
    const series = buildSeries([
      log({ at: 0, temp: 9, temperatureBreach: breach('b1') }),
      log({
        at: 0,
        temp: 9,
        sensorId: 'b',
        sensor: { id: 'b', name: 'Fridge B' },
        temperatureBreach: breach('b2'),
      }),
    ]);
    expect(breachMarkers(series)).toHaveLength(2);
  });
});

describe('OMS-REG-CCE-02.2 / .3 / .4 / .5 — hovering identifies the moment and every sensor’s reading', () => {
  const series = buildSeries([
    log({ at: 0, temp: 4 }),
    log({ at: 15, temp: 5 }),
    log({ at: 30, temp: 6 }),
    log({
      at: 1,
      temp: 3,
      sensorId: 'b',
      sensor: { id: 'b', name: 'Fridge B' },
    }),
    log({
      at: 16,
      temp: 3.5,
      sensorId: 'b',
      sensor: { id: 'b', name: 'Fridge B' },
    }),
  ]);

  it('names the reading nearest the hovered time as the moment', () => {
    const moment = readingsAt(series, T0 + 14 * MIN, 5 * MIN);
    expect(moment?.time).toBe(T0 + 15 * MIN);
  });

  it('lists each sensor’s reading at that moment, by name, with its temperature', () => {
    const moment = readingsAt(series, T0 + 14 * MIN, 5 * MIN);
    expect(moment?.readings).toEqual([
      expect.objectContaining({ name: 'Fridge A', temperature: 5 }),
      expect.objectContaining({ name: 'Fridge B', temperature: 3.5 }),
    ]);
  });

  it('leaves out a sensor with no reading near that moment', () => {
    const moment = readingsAt(series, T0 + 30 * MIN, 5 * MIN);
    expect(moment?.readings.map(r => r.name)).toEqual(['Fridge A']);
  });

  it('identifies nothing when no reading is near the hovered time', () => {
    expect(readingsAt(series, T0 + 120 * MIN, 5 * MIN)).toBeUndefined();
    expect(readingsAt([], T0, 5 * MIN)).toBeUndefined();
  });
});

describe('the chart says when the picture is incomplete', () => {
  it('is truncated exactly when the window held more than was received', () => {
    expect(isTruncated(8716, 8640)).toBe(true);
    expect(isTruncated(313, 313)).toBe(false);
    expect(isTruncated(0, 0)).toBe(false);
  });
});

describe('a line breaks where readings are missing rather than interpolating', () => {
  it('splits a series at a gap far wider than its usual interval', () => {
    const [series] = buildSeries([
      log({ at: 0, temp: 4 }),
      log({ at: 15, temp: 4 }),
      log({ at: 30, temp: 4 }),
      log({ at: 180, temp: 4 }),
      log({ at: 195, temp: 4 }),
    ]);
    const segments = lineSegments(series!.points);
    expect(segments.map(s => s.length)).toEqual([3, 2]);
  });

  it('keeps an evenly spaced series as one run, and a lone reading as one', () => {
    const [series] = buildSeries([
      log({ at: 0, temp: 4 }),
      log({ at: 15, temp: 4 }),
      log({ at: 30, temp: 4 }),
    ]);
    expect(lineSegments(series!.points)).toHaveLength(1);
    expect(
      lineSegments([{ time: T0, temperature: 4, breachId: null, logId: 'x' }])
    ).toHaveLength(1);
    expect(lineSegments([])).toEqual([]);
  });
});

describe('the fixed threshold bands and the axes', () => {
  it('draws the same two bands for every store — 2° and 8°', () => {
    expect(COLD_THRESHOLD).toBe(2);
    expect(HOT_THRESHOLD).toBe(8);
  });

  it('always includes both thresholds in the vertical domain and its ticks', () => {
    const series = buildSeries([
      log({ at: 0, temp: 4 }),
      log({ at: 15, temp: 5 }),
    ]);
    const domain = temperatureDomain(series);
    expect(domain.min).toBeLessThan(COLD_THRESHOLD);
    expect(domain.max).toBeGreaterThan(HOT_THRESHOLD);
    const ticks = temperatureTicks(domain);
    expect(ticks).toContain(COLD_THRESHOLD);
    expect(ticks).toContain(HOT_THRESHOLD);
    expect(ticks).toEqual([...ticks].sort((a, b) => a - b));
  });

  it('widens the domain to readings outside the bands', () => {
    const series = buildSeries([
      log({ at: 0, temp: -3 }),
      log({ at: 15, temp: 12 }),
    ]);
    const domain = temperatureDomain(series);
    expect(domain.min).toBeLessThanOrEqual(-4);
    expect(domain.max).toBeGreaterThanOrEqual(13);
  });

  it('spans the readings’ time extent, and has none with no readings', () => {
    const series = buildSeries([
      log({ at: 5, temp: 4 }),
      log({ at: 65, temp: 5 }),
    ]);
    expect(timeExtent(series)).toEqual({
      start: T0 + 5 * MIN,
      end: T0 + 65 * MIN,
    });
    expect(timeExtent([])).toBeUndefined();
  });

  it('lays evenly spaced time ticks across a window, first and last on its edges', () => {
    const ticks = timeTicks({ start: T0, end: T0 + 60 * MIN }, 6);
    expect(ticks).toHaveLength(7);
    expect(ticks[0]).toBe(T0);
    expect(ticks[6]).toBe(T0 + 60 * MIN);
  });
});
