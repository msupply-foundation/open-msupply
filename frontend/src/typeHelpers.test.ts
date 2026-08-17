import { describe, expect, it } from 'vitest';
import { sameFetchedValue } from './typeHelpers';

/*
 * The guard on the loop that made a line editor's fields impossible to type in:
 * a background refresh (api/syncStore § onRunCompleted re-reads me,
 * storeContext and the translation catalogue on every completed sync run)
 * republished an EQUAL payload as a fresh object. Solid compares by reference,
 * so every consumer woke, every memo downstream recomputed, and a table's
 * column set — being such a memo — yielded new columns, which rebuilt every
 * cell and took focus with them.
 *
 * The invariant the fix rests on: re-setting equal data leaves the signal
 * holding the ORIGINAL object, so nothing downstream can observe a change; a
 * real change still lands.
 */
describe('sameFetchedValue', () => {
  it('treats structurally equal payloads as equal, and different ones as not', () => {
    expect(sameFetchedValue({ a: 1, b: [2, 3] }, { a: 1, b: [2, 3] })).toBe(
      true
    );
    expect(sameFetchedValue({ a: 1 }, { a: 2 })).toBe(false);
    // Absent vs present is a real difference, not an equality.
    expect(sameFetchedValue({ a: 1 }, { a: 1, b: null })).toBe(false);
    expect(sameFetchedValue(undefined, undefined)).toBe(true);
    expect(sameFetchedValue(undefined, { a: 1 })).toBe(false);
  });

  /*
   * The signal-level behaviour this fix depends on — that a signal carrying
   * this comparator keeps its original value when re-set to equal data — is
   * NOT asserted here. Vitest resolves a second Solid instance for this
   * project (see ui/elements/table/renderTemplate.test.tsx, which documents the
   * same limitation), so signal identity through `equals` is not reliably
   * observable in-process. It was verified in the browser instead: idle DOM
   * removals in the open stocktake line editor fell from 138/sec to 1/sec, and
   * the post-sync me / storeContext / catalogue re-reads stopped rebuilding the
   * table. Measurement, not assertion, is the guard on that half.
   */
});
