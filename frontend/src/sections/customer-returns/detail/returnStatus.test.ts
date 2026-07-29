import { describe, expect, it } from 'vitest';
import {
  currentStep,
  filterByStatusPreference,
  isReturnDisabled,
  nextStatuses,
  offeredFlow,
  returnKind,
  statusFlow,
  statusIndex,
  statusSteps,
} from './returnStatus';
import type { CustomerReturnInfoFragment } from './customerReturnDetail.generated';

// Status/kind logic for customer returns (spec/customer-returns/rules.md
// § manual vs transfer, § status lifecycle, § editability;
// acceptance.md AC-* cited per test).

const node = (
  over: Partial<CustomerReturnInfoFragment> = {}
): CustomerReturnInfoFragment => ({
  id: 'r1',
  invoiceNumber: 1,
  status: 'NEW',
  onHold: false,
  colour: null,
  comment: null,
  theirReference: null,
  createdDatetime: '2026-01-01T00:00:00Z',
  pickedDatetime: null,
  shippedDatetime: null,
  deliveredDatetime: null,
  receivedDatetime: null,
  verifiedDatetime: null,
  otherPartyId: 'c1',
  otherPartyName: 'Customer',
  user: null,
  linkedShipment: null,
  originalShipment: null,
  customFields: null,
  ...over,
});

describe('returnKind (rules § manual vs transfer)', () => {
  it('is transfer exactly when a transfer counterpart exists', () => {
    expect(returnKind(node())).toBe('manual');
    expect(returnKind(node({ linkedShipment: { id: 'x' } }))).toBe('transfer');
  });
});

describe('status flow per kind (rules § status lifecycle)', () => {
  it('manual sequence is New → Received → Verified', () => {
    expect(statusFlow('manual')).toEqual(['NEW', 'RECEIVED', 'VERIFIED']);
  });

  it('transfer sequence passes through Picked and Shipped', () => {
    expect(statusFlow('transfer')).toEqual([
      'NEW',
      'PICKED',
      'SHIPPED',
      'RECEIVED',
      'VERIFIED',
    ]);
  });

  it('DELIVERED is in neither flow (customer returns always skip it)', () => {
    expect(statusFlow('manual')).not.toContain('DELIVERED');
    expect(statusFlow('transfer')).not.toContain('DELIVERED');
  });
});

describe('nextStatuses — forward-only targets', () => {
  // OMS-REG-DIST-07.37 — a NEW manual return may go straight to VERIFIED, skipping
  // RECEIVED (both forward steps offered).
  it('offers both confirmations from NEW on a manual return', () => {
    expect(nextStatuses('manual', 'NEW')).toEqual(['RECEIVED', 'VERIFIED']);
  });

  // OMS-REG-DIST-07.39 — forward only: from RECEIVED only VERIFIED remains; VERIFIED is
  // terminal and offers nothing.
  it('offers only VERIFIED from RECEIVED, nothing from VERIFIED', () => {
    expect(nextStatuses('manual', 'RECEIVED')).toEqual(['VERIFIED']);
    expect(nextStatuses('manual', 'VERIFIED')).toEqual([]);
    expect(nextStatuses('transfer', 'VERIFIED')).toEqual([]);
  });

  // OMS-REG-DIST-07.44 — a transfer return becomes advanceable once SHIPPED;
  // before that its lifecycle is in the sending store's hands.
  it('offers nothing on a transfer return before SHIPPED', () => {
    expect(nextStatuses('transfer', 'NEW')).toEqual([]);
    expect(nextStatuses('transfer', 'PICKED')).toEqual([]);
    expect(nextStatuses('transfer', 'SHIPPED')).toEqual([
      'RECEIVED',
      'VERIFIED',
    ]);
  });
});

describe('isReturnDisabled (rules § editability)', () => {
  // OMS-REG-DIST-07.26 — a VERIFIED return is immutable, whatever its kind.
  it('disables a VERIFIED return', () => {
    expect(isReturnDisabled(node({ status: 'VERIFIED' }))).toBe(true);
    expect(
      isReturnDisabled(
        node({ status: 'VERIFIED', linkedShipment: { id: 'x' } })
      )
    ).toBe(true);
  });

  it('keeps a manual return editable until VERIFIED', () => {
    expect(isReturnDisabled(node({ status: 'NEW' }))).toBe(false);
    expect(isReturnDisabled(node({ status: 'RECEIVED' }))).toBe(false);
  });

  // OMS-REG-DIST-07.43 — a transfer return is read-only until RECEIVED.
  it('keeps a transfer return read-only until RECEIVED', () => {
    const transfer = (status: CustomerReturnInfoFragment['status']) =>
      node({ status, linkedShipment: { id: 'x' } });
    expect(isReturnDisabled(transfer('PICKED'))).toBe(true);
    expect(isReturnDisabled(transfer('SHIPPED'))).toBe(true);
    expect(isReturnDisabled(transfer('RECEIVED'))).toBe(false);
  });
});

describe('statusSteps / statusIndex — the lifecycle indicator', () => {
  it('maps each reached stage to its datetime', () => {
    const steps = statusSteps(
      'manual',
      node({
        status: 'RECEIVED',
        receivedDatetime: '2026-01-02T00:00:00Z',
      })
    );
    expect(steps).toHaveLength(3);
    expect(steps[0].date).toBe('2026-01-01T00:00:00Z'); // created
    expect(steps[1].date).toBe('2026-01-02T00:00:00Z'); // received
    expect(steps[2].date).toBeUndefined(); // verified — not reached
    expect(statusIndex('manual', 'RECEIVED')).toBe(1);
    expect(statusIndex('transfer', 'RECEIVED')).toBe(3);
  });
});

describe('offeredFlow / currentStep — pref-filtered lifecycle indicator', () => {
  // rules § preference gates: the invoice-status-options preference limits
  // EVERY status surface, the lifecycle indicator included; the current stage
  // falls back to the nearest offered status at-or-before the actual one.
  it('filters the indicator steps and keeps a sensible current stage', () => {
    expect(offeredFlow('manual', [])).toEqual(['NEW', 'RECEIVED', 'VERIFIED']);
    expect(offeredFlow('manual', ['NEW', 'VERIFIED'])).toEqual([
      'NEW',
      'VERIFIED',
    ]);
    const steps = statusSteps(
      'manual',
      node({ status: 'RECEIVED', receivedDatetime: '2026-01-02T00:00:00Z' }),
      ['NEW', 'VERIFIED']
    );
    expect(steps.map(s => s.label)).toHaveLength(2);
    // Actual status RECEIVED is hidden by the pref → current falls back to
    // NEW (the nearest offered stage at-or-before).
    expect(currentStep('manual', 'RECEIVED', ['NEW', 'VERIFIED'])).toBe(0);
    expect(currentStep('manual', 'RECEIVED', [])).toBe(1);
    expect(currentStep('manual', 'VERIFIED', ['NEW', 'VERIFIED'])).toBe(1);
  });
});

describe('filterByStatusPreference (rules § preference gates)', () => {
  // The invoice-status-options preference limits which statuses the controls
  // offer — a display gate only; empty = no restriction.
  it('filters targets by the preference, empty meaning unrestricted', () => {
    expect(filterByStatusPreference(['RECEIVED', 'VERIFIED'], [])).toEqual([
      'RECEIVED',
      'VERIFIED',
    ]);
    expect(
      filterByStatusPreference(['RECEIVED', 'VERIFIED'], ['NEW', 'VERIFIED'])
    ).toEqual(['VERIFIED']);
  });
});
