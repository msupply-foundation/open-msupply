import { describe, expect, it } from 'vitest';
import {
  currentStep,
  filterByStatusPreference,
  hasOriginalShipment,
  isReturnDisabled,
  nextStatuses,
  offeredFlow,
  statusIndex,
  statusSteps,
  STATUS_FLOW,
} from './returnStatus';
import type { SupplierReturnInfoFragment } from './supplierReturnDetail.generated';

// Status/editability logic for supplier returns (spec/supplier-returns/rules.md
// § status lifecycle, § editability, § preference gates; behaviour IDs cited
// per test).

const node = (
  over: Partial<SupplierReturnInfoFragment> = {}
): SupplierReturnInfoFragment => ({
  id: 'r1',
  invoiceNumber: 1,
  status: 'NEW',
  onHold: false,
  colour: null,
  comment: null,
  theirReference: null,
  transportReference: null,
  createdDatetime: '2026-01-01T00:00:00Z',
  pickedDatetime: null,
  shippedDatetime: null,
  receivedDatetime: null,
  verifiedDatetime: null,
  otherPartyId: 's1',
  otherPartyName: 'Supplier',
  user: null,
  linkedShipment: null,
  originalShipment: null,
  customFields: null,
  ...over,
});

describe('STATUS_FLOW / statusIndex — the lifecycle sequence (rules § status lifecycle)', () => {
  it('is New · Picked · Shipped · Received · Verified', () => {
    expect(STATUS_FLOW).toEqual([
      'NEW',
      'PICKED',
      'SHIPPED',
      'RECEIVED',
      'VERIFIED',
    ]);
    expect(statusIndex('SHIPPED')).toBe(2);
  });
});

describe('nextStatuses — forward-only targets (REPL-06 .17/.18/.36, SRN-001 .6)', () => {
  it('offers both confirmations from NEW — a NEW return may skip straight to Shipped', () => {
    expect(nextStatuses('NEW')).toEqual(['PICKED', 'SHIPPED']);
  });

  it('offers only Shipped from Picked', () => {
    expect(nextStatuses('PICKED')).toEqual(['SHIPPED']);
  });

  it('offers nothing once Shipped (terminal, forward-only — reversal not expressible)', () => {
    expect(nextStatuses('SHIPPED')).toEqual([]);
  });
});

describe('isReturnDisabled (rules § editability; SRN-001 .6)', () => {
  it('keeps a NEW or PICKED return editable', () => {
    expect(isReturnDisabled(node({ status: 'NEW' }))).toBe(false);
    expect(isReturnDisabled(node({ status: 'PICKED' }))).toBe(false);
  });

  it('disables a SHIPPED return (terminal for this store)', () => {
    expect(isReturnDisabled(node({ status: 'SHIPPED' }))).toBe(true);
  });
});

describe('hasOriginalShipment — the supplier field freeze (rules § header rules)', () => {
  it('is true exactly when an originating inbound shipment is recorded', () => {
    expect(hasOriginalShipment(node())).toBe(false);
    expect(
      hasOriginalShipment(
        node({
          originalShipment: {
            id: 'is1',
          } as SupplierReturnInfoFragment['originalShipment'],
        })
      )
    ).toBe(true);
  });
});

describe('statusSteps — the lifecycle indicator', () => {
  it('maps each reached stage to its datetime', () => {
    const steps = statusSteps(
      node({ status: 'PICKED', pickedDatetime: '2026-01-02T00:00:00Z' })
    );
    expect(steps).toHaveLength(5);
    expect(steps[0].date).toBe('2026-01-01T00:00:00Z'); // created / NEW
    expect(steps[1].date).toBe('2026-01-02T00:00:00Z'); // picked
    expect(steps[2].date).toBeUndefined(); // shipped — not reached
    expect(steps[3].date).toBeUndefined(); // received — counterpart's, not set
  });
});

describe('offeredFlow / currentStep — pref-filtered lifecycle indicator (rules § preference gates)', () => {
  it('filters the indicator to the offered statuses and keeps a sensible current stage', () => {
    expect(offeredFlow([])).toEqual(STATUS_FLOW);
    expect(offeredFlow(['NEW', 'SHIPPED'])).toEqual(['NEW', 'SHIPPED']);
    // Actual status PICKED is hidden by the pref → current falls back to NEW
    // (the nearest offered stage at-or-before).
    expect(currentStep('PICKED', ['NEW', 'SHIPPED'])).toBe(0);
    expect(currentStep('PICKED', [])).toBe(1);
    expect(currentStep('SHIPPED', ['NEW', 'SHIPPED'])).toBe(1);
  });
});

describe('filterByStatusPreference (rules § preference gates)', () => {
  it('filters targets by the preference, empty meaning unrestricted', () => {
    expect(filterByStatusPreference(['PICKED', 'SHIPPED'], [])).toEqual([
      'PICKED',
      'SHIPPED',
    ]);
    expect(
      filterByStatusPreference(['PICKED', 'SHIPPED'], ['NEW', 'SHIPPED'])
    ).toEqual(['SHIPPED']);
  });
});
