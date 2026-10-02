import { describe, expect, it } from 'vitest';
import { leakToRemove } from './wedgeCapture';

// What a keyboard-emulation scan takes back out of the focused field
// (spec/barcode-scanning/rules.md § Triggering a scan — "A scan is never also
// typed"). The first key of a run is let through before it can be recognised
// as a scan; once it is, only what that key actually put in the field is
// removed.

describe('leakToRemove', () => {
  it('.135 removes the leaked character just before the caret', () => {
    // "12" with the caret at the end; the scan's first key typed "0".
    expect(leakToRemove('12', '120', 3)).toEqual({ start: 2, end: 3 });
  });

  it('.135 removes a leak typed mid-value', () => {
    // Caret after "1" in "12"; the leak landed between them.
    expect(leakToRemove('12', '1]2', 2)).toEqual({ start: 1, end: 2 });
  });

  it('.136 a number field that refused the first key keeps the user’s own digits', () => {
    // A `]` the field filtered out: the value never changed, so there is
    // nothing to remove — deleting "one before the caret" would eat the 2.
    expect(leakToRemove('12', '12', 2)).toBeUndefined();
  });

  it('leaves the field alone when it changed in some other way', () => {
    // The field reformatted itself (a separator added): not the leak's doing.
    expect(leakToRemove('1000', '1,0000', 6)).toBeUndefined();
  });

  it('leaves the field alone when the caret is unknown or before the change', () => {
    expect(leakToRemove('', 'A', null)).toBeUndefined();
    expect(leakToRemove('12', '123', 0)).toBeUndefined();
  });
});
