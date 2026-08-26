import { describe, expect, it } from 'vitest';
import { reportSeedArgs } from './reportSeedArgs';

const program = { id: 'program-1' };
const period = { id: 'period-1' };
const nameId = 'name-1';

describe('reportSeedArgs', () => {
  it('seeds a program order with its program, period and customer identity', () => {
    expect(reportSeedArgs({ program, period }, nameId)).toEqual({
      programId: 'program-1',
      periodId: 'period-1',
      customerNameId: 'name-1',
    });
  });

  // open-msupply#12713: these were previously withheld whenever the Indicators
  // tab was hidden — an emergency order, a supplier that is not a store, or a
  // program with no indicators defined. A report template declaring
  // $programId then failed with "Variable programId is not defined." The seeds
  // depend only on the order's own data, never on whether the tab is shown.
  it('seeds an order whose Indicators tab is hidden', () => {
    // The helper takes no gate, so an emergency order — the reported case —
    // is seeded exactly like any other program order.
    expect(reportSeedArgs({ program, period }, nameId)).toEqual({
      programId: 'program-1',
      periodId: 'period-1',
      customerNameId: 'name-1',
    });
  });

  it('sends nothing for a non-program order', () => {
    expect(
      reportSeedArgs({ program: null, period: null }, nameId)
    ).toBeUndefined();
  });

  it('sends nothing until the store name id resolves', () => {
    expect(reportSeedArgs({ program, period }, undefined)).toBeUndefined();
  });

  it('sends nothing for a program order with no period', () => {
    expect(reportSeedArgs({ program, period: null }, nameId)).toBeUndefined();
  });

  it('sends nothing when the order has not loaded', () => {
    expect(reportSeedArgs(undefined, nameId)).toBeUndefined();
  });
});
