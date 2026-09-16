import { describe, expect, it } from 'vitest';
import { isEmptySend } from './internalOrderDetailStatus';

// The empty-send refusal (AC-S4; rules › Lifecycle; D20; OMS-REG-REPL-05
// `.17`): a send that would produce an empty order is refused client-side —
// no lines, or every line zero-requested while the store trims zero lines on
// send. Where the store keeps zero-requested lines
// (keepRequisitionLinesWithZeroRequestedQuantityOnFinalised), an all-zero
// order is sendable, its lines surviving the send.

const lines = (...requested: number[]) =>
  requested.map(requestedQuantity => ({ requestedQuantity }));

describe('isEmptySend', () => {
  it('refuses an order with no lines regardless of the preference', () => {
    expect(isEmptySend([], false)).toBe(true);
    expect(isEmptySend([], true)).toBe(true);
  });

  it('refuses an all-zero order where the store trims zero lines', () => {
    expect(isEmptySend(lines(0, 0), false)).toBe(true);
  });

  it('allows an all-zero order where the store keeps zero lines (D20)', () => {
    expect(isEmptySend(lines(0, 0), true)).toBe(false);
  });

  it('allows any order with a non-zero-requested line', () => {
    expect(isEmptySend(lines(0, 3), false)).toBe(false);
    expect(isEmptySend(lines(0, 3), true)).toBe(false);
  });
});
