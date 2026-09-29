import { describe, expect, it } from 'vitest';
import {
  breachKind,
  breachShapeLabelKey,
  breachTypeLabelKey,
  durationParts,
  durationUnits,
  formatTemperature,
  hasTemperature,
  isOngoing,
  statusCell,
  statusLabelKey,
} from './breachDisplay';

// How a breach and a temperature are presented (spec/cold-chain-monitoring
// ui-surface T2/T3/S3/S5; rules › temperature display), at the logic level.
// Anchors: spec/cold-chain-monitoring/cases/OMS-REG-CCE-02.

describe('OMS-REG-CCE-02.15 — an unacknowledged breach offers the acknowledge action', () => {
  it('yields the acknowledge cell for an unacknowledged breach, comment or not', () => {
    expect(statusCell({ unacknowledged: true, comment: null })).toEqual({
      kind: 'acknowledge',
    });
    expect(
      statusCell({ unacknowledged: true, comment: 'probe revert' })
    ).toEqual({ kind: 'acknowledge' });
  });

  it('reads the inverted flag as the word Unacknowledged', () => {
    expect(statusLabelKey({ unacknowledged: true })).toBe(
      'label.unacknowledged'
    );
    expect(statusLabelKey({ unacknowledged: false })).toBe(
      'label.acknowledged'
    );
  });
});

describe('OMS-REG-CCE-02.16 — an acknowledged breach with a comment reveals it', () => {
  it('yields the comment cell carrying the stored comment', () => {
    expect(
      statusCell({
        unacknowledged: false,
        comment: 'Acknowledged by demo on 8 Sep 2026: door left open.',
      })
    ).toEqual({
      kind: 'comment',
      comment: 'Acknowledged by demo on 8 Sep 2026: door left open.',
    });
  });

  it('offers nothing for an acknowledged breach without one', () => {
    expect(statusCell({ unacknowledged: false, comment: null })).toEqual({
      kind: 'none',
    });
    expect(statusCell({ unacknowledged: false, comment: '' })).toEqual({
      kind: 'none',
    });
  });
});

describe('OMS-REG-CCE-02.17 — a breach with no end is ongoing', () => {
  it('is ongoing exactly while endDatetime is null', () => {
    expect(isOngoing({ endDatetime: null })).toBe(true);
    expect(isOngoing({ endDatetime: '2026-09-08T09:00:00.000Z' })).toBe(false);
  });

  it('derives a duration from start and end, never from the stored zero', () => {
    expect(
      durationParts('2026-09-08T06:00:00.000Z', '2026-09-08T09:35:00.000Z')
    ).toEqual({ days: 0, hours: 3, minutes: 35 });
    expect(
      durationParts('2026-09-06T06:00:00.000Z', '2026-09-08T07:05:00.000Z')
    ).toEqual({ days: 2, hours: 1, minutes: 5 });
  });

  it('collapses an end before its start, or an unparseable instant, to zero', () => {
    expect(
      durationParts('2026-09-08T09:00:00.000Z', '2026-09-08T06:00:00.000Z')
    ).toEqual({ days: 0, hours: 0, minutes: 0 });
    expect(durationParts('not a date', '2026-09-08T06:00:00.000Z')).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
    });
  });

  it('states the two most significant units, and a sub-minute span as 0 min', () => {
    expect(durationUnits({ days: 2, hours: 1, minutes: 5 })).toEqual([
      ['day', 2],
      ['hour', 1],
    ]);
    expect(durationUnits({ days: 0, hours: 3, minutes: 35 })).toEqual([
      ['hour', 3],
      ['minute', 35],
    ]);
    expect(durationUnits({ days: 2, hours: 0, minutes: 5 })).toEqual([
      ['day', 2],
      ['minute', 5],
    ]);
    expect(durationUnits({ days: 0, hours: 0, minutes: 0 })).toEqual([
      ['minute', 0],
    ]);
  });
});

describe('a breach kind is two facts — hot or cold, cumulative or consecutive', () => {
  it('splits the four stored kinds into their halves', () => {
    expect(breachKind('HOT_CUMULATIVE')).toEqual({
      kind: 'breach',
      hot: true,
      cumulative: true,
    });
    expect(breachKind('COLD_CONSECUTIVE')).toEqual({
      kind: 'breach',
      hot: false,
      cumulative: false,
    });
    expect(breachShapeLabelKey('HOT_CUMULATIVE')).toBe('label.cumulative');
    expect(breachShapeLabelKey('COLD_CONSECUTIVE')).toBe('label.consecutive');
    expect(breachTypeLabelKey('HOT_CONSECUTIVE')).toBe('label.hot-consecutive');
    expect(breachTypeLabelKey('COLD_CUMULATIVE')).toBe('label.cold-cumulative');
  });

  it('presents EXCURSION as itself, never as a cold consecutive breach', () => {
    expect(breachKind('EXCURSION')).toEqual({ kind: 'excursion' });
    expect(breachShapeLabelKey('EXCURSION')).toBe('label.excursion');
    expect(breachTypeLabelKey('EXCURSION')).toBe('label.excursion');
    expect(breachTypeLabelKey('EXCURSION')).not.toBe('label.cold-consecutive');
  });
});

describe('temperature display — absence, not falsiness', () => {
  it('treats a reading of exactly 0 °C as present', () => {
    expect(hasTemperature(0)).toBe(true);
    expect(hasTemperature(-0.5)).toBe(true);
    expect(hasTemperature(9.5)).toBe(true);
  });

  it('treats only null and undefined as absent', () => {
    expect(hasTemperature(null)).toBe(false);
    expect(hasTemperature(undefined)).toBe(false);
  });

  it('renders zero as a temperature with its unit, to at most two decimals', () => {
    expect(formatTemperature(0)).toMatch(/0.*°C/);
    expect(formatTemperature(9.5)).toMatch(/9\.5.*°C/);
    expect(formatTemperature(2.3456)).toMatch(/2\.35.*°C/);
  });
});
