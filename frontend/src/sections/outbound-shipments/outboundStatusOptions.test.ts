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

import { currentStep, trackStages } from '@/domain/invoice/statusGate';
import { STATUS_FLOW } from './outboundStatus';
import { allowedStatuses } from './outboundStatusOptions';

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

describe('the crumbs keep the current stage (OMS-REG-DIST-04.29)', () => {
  const allowed = ['NEW', 'PICKED', 'SHIPPED'] as const;
  const stages = (status: string, allowedList: readonly string[]) =>
    trackStages(STATUS_FLOW, allowedList, status);
  const step = (status: string, allowedList: readonly string[]) =>
    currentStep(stages(status, allowedList), status);

  it('marks the current status itself when the preference includes it', () => {
    expect(step('PICKED', allowed)).toBe(1);
  });

  it('keeps an excluded current stage in the crumbs, and marks it', () => {
    // The shipment IS allocated; the crumb stays rather than reading New
    expect(stages('ALLOCATED', allowed)).toEqual([
      'NEW',
      'ALLOCATED',
      'PICKED',
      'SHIPPED',
    ]);
    expect(step('ALLOCATED', allowed)).toBe(1);
    // Likewise the receiver-set VERIFIED, past the end of the allowed set
    expect(step('VERIFIED', allowed)).toBe(3);
  });

  it('excludes a stage the shipment is not resting on', () => {
    expect(stages('PICKED', allowed)).toEqual(['NEW', 'PICKED', 'SHIPPED']);
  });

  it('marks the current stage even when it precedes every allowed one', () => {
    expect(step('NEW', ['PICKED', 'SHIPPED'])).toBe(0);
  });

  it('marks nothing for a non-flow status (CANCELLED indexes at −1)', () => {
    expect(step('CANCELLED', allowed)).toBe(-1);
  });
});
