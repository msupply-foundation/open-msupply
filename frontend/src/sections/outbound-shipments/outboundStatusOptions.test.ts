import { describe, expect, it, vi } from 'vitest';

// The invoice-status-options gate (spec/outbound-shipments rules.md §
// store-preference gates; anchor OMS-REG-DIST-04.22): the preference limits
// the list filter, the footer crumbs, and the confirm options, and an
// unresolved/empty preference restricts nothing (rules.md — the standing
// safe-default precedent). The preference read is driven directly,
// navGates-style.
const state = {
  invoiceStatusOptions: [] as string[],
};

vi.mock('@/store/storeContext', () => ({
  outboundShipmentPreferences: () => ({
    invoiceStatusOptions: state.invoiceStatusOptions,
  }),
}));

import { STATUS_FLOW } from './outboundStatus';
import { allowedStatuses, indicatorStep } from './outboundStatusOptions';

describe('allowedStatuses (rules.md § preference gates)', () => {
  it('offers the full flow while the preference is empty / not yet loaded', () => {
    state.invoiceStatusOptions = [];
    expect(allowedStatuses()).toEqual(STATUS_FLOW);
  });

  it('limits to the configured statuses, in flow order not preference order', () => {
    state.invoiceStatusOptions = ['SHIPPED', 'NEW', 'PICKED'];
    expect(allowedStatuses()).toEqual(['NEW', 'PICKED', 'SHIPPED']);
  });

  it('ignores statuses outside the outbound flow (CANCELLED is list-only)', () => {
    state.invoiceStatusOptions = ['NEW', 'CANCELLED', 'VERIFIED'];
    expect(allowedStatuses()).toEqual(['NEW', 'VERIFIED']);
  });

  it('falls back to the full flow when no configured status is a flow member', () => {
    state.invoiceStatusOptions = ['CANCELLED'];
    expect(allowedStatuses()).toEqual(STATUS_FLOW);
  });
});

describe('indicatorStep (OMS-REG-DIST-04.22 — excluded current status shows the nearest included earlier one)', () => {
  const allowed = ['NEW', 'PICKED', 'SHIPPED'] as const;

  it('marks the current status itself when the preference includes it', () => {
    expect(indicatorStep(allowed, STATUS_FLOW.indexOf('PICKED'))).toBe(1);
  });

  it('marks the nearest included earlier status when the current one is excluded', () => {
    // ALLOCATED is excluded → NEW (step 0) lights up.
    expect(indicatorStep(allowed, STATUS_FLOW.indexOf('ALLOCATED'))).toBe(0);
    // VERIFIED is excluded → SHIPPED (step 2), the last included stage.
    expect(indicatorStep(allowed, STATUS_FLOW.indexOf('VERIFIED'))).toBe(2);
  });

  it('marks nothing when the current status precedes every included stage', () => {
    expect(
      indicatorStep(['PICKED', 'SHIPPED'], STATUS_FLOW.indexOf('NEW'))
    ).toBe(-1);
  });

  it('marks nothing for a non-flow status (CANCELLED indexes at −1)', () => {
    expect(indicatorStep(allowed, -1)).toBe(-1);
  });
});
