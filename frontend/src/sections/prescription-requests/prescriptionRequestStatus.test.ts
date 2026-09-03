import { describe, expect, it } from 'vitest';
import {
  asRequestStatus,
  isEditable,
  statusIndex,
  statusSteps,
} from './prescriptionRequestStatus';

// Status vocabulary gates (spec/prescription-requests/rules.md § the lifecycle,
// § editability; AC-N5, AC-R3).

describe('asRequestStatus narrows to the vocabulary (safe default locked)', () => {
  it('keeps the three real statuses', () => {
    expect(asRequestStatus('NEW')).toBe('NEW');
    expect(asRequestStatus('READY_TO_DISPENSE')).toBe('READY_TO_DISPENSE');
    expect(asRequestStatus('DISPENSED')).toBe('DISPENSED');
  });
  it('treats anything unexpected as DISPENSED (read-only)', () => {
    expect(asRequestStatus('CANCELLED')).toBe('DISPENSED');
    expect(asRequestStatus('')).toBe('DISPENSED');
  });
});

describe('isEditable — New only (AC-N5, AC-R3, AC-D2)', () => {
  it('is true only for NEW', () => {
    expect(isEditable('NEW')).toBe(true);
    expect(isEditable('READY_TO_DISPENSE')).toBe(false);
    expect(isEditable('DISPENSED')).toBe(false);
  });
});

describe('lifecycle crumbs', () => {
  it('requests the three steps with their recorded times', () => {
    const steps = statusSteps({
      createdDatetime: '2026-08-25T00:00:00Z',
      readyDatetime: '2026-08-26T00:00:00Z',
      dispensedDatetime: null,
    });
    expect(steps).toHaveLength(3);
    expect(steps[0]?.date).toBe('2026-08-25T00:00:00Z');
    expect(steps[1]?.date).toBe('2026-08-26T00:00:00Z');
    expect(steps[2]?.date).toBeUndefined();
    expect(statusIndex('READY_TO_DISPENSE')).toBe(1);
  });
});
