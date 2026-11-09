import { describe, it, expect } from 'vitest';
import { canConfirmNewStock, packSizeValid, packsValid } from './newStockEntry';

// The new-stock modal's pre-validation. The server enforces the same rules and
// is exercised in the e2e/ suites (conformance C2); these pin the client gate
// so an invalid entry never reaches the wire in the first place.
//
// Anchors: spec/stock/cases/OMS-REG-SMV-02.
//   .34 — a pack size below 1, or a negative pack count, is rejected
//   .36 — with active positive reasons configured, a reason is required
//   .37 — confirm is unavailable until item, pack size, and pack quantity are set

const entry = (
  over: Partial<Parameters<typeof canConfirmNewStock>[0]> = {}
) => ({
  hasItem: true,
  packSize: 1,
  numberOfPacks: 1,
  positiveReasonsRequired: false,
  hasReason: false,
  ...over,
});

describe('OMS-REG-SMV-02.34 — pack bounds', () => {
  it('rejects a pack size below 1', () => {
    expect(packSizeValid(0)).toBe(false);
    expect(packSizeValid(0.5)).toBe(false);
    expect(packSizeValid(-1)).toBe(false);
  });

  it('accepts a pack size of 1 or more', () => {
    expect(packSizeValid(1)).toBe(true);
    expect(packSizeValid(100)).toBe(true);
  });

  it('rejects a negative pack count', () => {
    expect(packsValid(-1)).toBe(false);
  });

  it('accepts a pack count of zero — a deliberate zero is a real entry', () => {
    expect(packsValid(0)).toBe(true);
  });
});

describe('OMS-REG-SMV-02.37 — confirm gating', () => {
  it('is unavailable until an item is chosen', () => {
    expect(canConfirmNewStock(entry({ hasItem: false }))).toBe(false);
  });

  it('is unavailable while the pack size is unset', () => {
    expect(canConfirmNewStock(entry({ packSize: null }))).toBe(false);
    expect(canConfirmNewStock(entry({ packSize: undefined }))).toBe(false);
  });

  it('is unavailable while the pack quantity is unset', () => {
    // Distinct from zero: absent blocks, zero does not.
    expect(canConfirmNewStock(entry({ numberOfPacks: null }))).toBe(false);
    expect(canConfirmNewStock(entry({ numberOfPacks: 0 }))).toBe(true);
  });

  it('is available once item, pack size, and pack quantity are all set', () => {
    expect(canConfirmNewStock(entry())).toBe(true);
  });

  it('is unavailable when a bound is violated even with everything set', () => {
    expect(canConfirmNewStock(entry({ packSize: 0 }))).toBe(false);
    expect(canConfirmNewStock(entry({ numberOfPacks: -1 }))).toBe(false);
  });
});

describe('OMS-REG-SMV-02.36 — the positive reason, when configured', () => {
  it('blocks confirm while active positive reasons exist and none is chosen', () => {
    expect(canConfirmNewStock(entry({ positiveReasonsRequired: true }))).toBe(
      false
    );
  });

  it('releases confirm once a reason is chosen', () => {
    expect(
      canConfirmNewStock(
        entry({ positiveReasonsRequired: true, hasReason: true })
      )
    ).toBe(true);
  });

  it('does not require a reason when none are configured', () => {
    expect(canConfirmNewStock(entry({ positiveReasonsRequired: false }))).toBe(
      true
    );
  });
});
