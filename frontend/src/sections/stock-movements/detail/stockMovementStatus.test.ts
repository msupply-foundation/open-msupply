import { describe, expect, it } from 'vitest';
import {
  blockedByZeroLines,
  currentStep,
  isFinalised,
  nextStatuses,
  statusSteps,
} from './stockMovementStatus';
import type { StockMovementInfoFragment } from './stockMovementDetail.generated';

// Anchors: spec/stock-movements/cases/OMS-REG-SMV-10.
//   .4 — any status change with zero lines is blocked in the UI, nothing submitted
//   .6 — status never moves backwards
// (rules.md § status lifecycle, § status changes and the zero-line gate)

const node = (
  over: Partial<StockMovementInfoFragment> = {}
): StockMovementInfoFragment => ({
  id: 'm1',
  stockMovementNumber: 1,
  status: 'NEW',
  createdDatetime: '2026-01-01T00:00:00Z',
  confirmedDatetime: null,
  finalisedDatetime: null,
  comment: null,
  lineCount: 0,
  user: null,
  ...over,
});

describe('OMS-REG-SMV-10.6 — status is strictly forward', () => {
  it('offers both forward targets from NEW (skip to FINALISED reachable)', () => {
    expect(nextStatuses('NEW')).toEqual(['CONFIRMED', 'FINALISED']);
  });

  it('offers only FINALISED from CONFIRMED — never NEW again', () => {
    expect(nextStatuses('CONFIRMED')).toEqual(['FINALISED']);
  });

  it('offers nothing from FINALISED (terminal)', () => {
    expect(nextStatuses('FINALISED')).toEqual([]);
  });
});

describe('OMS-REG-SMV-10.4 — the zero-line gate', () => {
  it('blocks any status change while the movement has no lines', () => {
    expect(blockedByZeroLines(node({ lineCount: 0 }))).toBe(true);
  });

  it('releases once a line exists', () => {
    expect(blockedByZeroLines(node({ lineCount: 1 }))).toBe(false);
  });
});

describe('editability gate (rules § editability — guard-rail for .26–.28)', () => {
  it('NEW and CONFIRMED are equally editable; only FINALISED disables', () => {
    expect(isFinalised('NEW')).toBe(false);
    expect(isFinalised('CONFIRMED')).toBe(false);
    expect(isFinalised('FINALISED')).toBe(true);
  });
});

describe('lifecycle indicator steps (ui-surface § status footer)', () => {
  it('dates each stage once reached, leaving unreached stages undated', () => {
    const steps = statusSteps(
      node({ status: 'CONFIRMED', confirmedDatetime: '2026-01-02T00:00:00Z' })
    );
    expect(steps.map(s => s.date)).toEqual([
      '2026-01-01T00:00:00Z',
      '2026-01-02T00:00:00Z',
      undefined,
    ]);
    expect(currentStep('CONFIRMED')).toBe(1);
  });
});
