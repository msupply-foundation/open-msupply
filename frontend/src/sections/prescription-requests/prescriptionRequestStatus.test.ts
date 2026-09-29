import { describe, expect, it } from 'vitest';
import {
  asRequestStatus,
  DISPENSATION_LINK_PERMISSION,
  isEditable,
  readsDispensations,
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

// The generated-dispensation back-link's gate (issue #637). The lookup is a
// DISPENSING read, so it authorises on a permission this vertical's own users
// need not hold — and the hand-over is what first makes the resource fetch, so
// an ungated one raises the permission-denied modal exactly on Ready to
// dispense.
describe('readsDispensations gates the back-link on status AND the dispensing read', () => {
  const holding =
    (...permissions: string[]) =>
    (permission: string) =>
      permissions.includes(permission);

  it('does not look while the request is still New — nothing is generated yet', () => {
    expect(
      readsDispensations('NEW', holding(DISPENSATION_LINK_PERMISSION))
    ).toBe(false);
  });

  it('does not look without the dispensing read, at any status past New', () => {
    expect(readsDispensations('READY_TO_DISPENSE', holding())).toBe(false);
    expect(readsDispensations('DISPENSED', holding())).toBe(false);
    // A prescriber holds the request vertical's own permissions and no more.
    expect(
      readsDispensations(
        'READY_TO_DISPENSE',
        holding('PRESCRIPTION_REQUEST_QUERY', 'PRESCRIPTION_REQUEST_MUTATE')
      )
    ).toBe(false);
  });

  it('looks once past New for a user holding the dispensing read', () => {
    expect(
      readsDispensations(
        'READY_TO_DISPENSE',
        holding(DISPENSATION_LINK_PERMISSION)
      )
    ).toBe(true);
    expect(
      readsDispensations('DISPENSED', holding(DISPENSATION_LINK_PERMISSION))
    ).toBe(true);
  });

  it('borrows the dispensing vertical read, not the request vertical one', () => {
    expect(DISPENSATION_LINK_PERMISSION).toBe('PRESCRIPTION_QUERY');
  });
});
