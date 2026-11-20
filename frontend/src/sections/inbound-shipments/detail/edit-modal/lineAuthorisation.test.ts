import { describe, expect, it } from 'vitest';
import {
  authStatusOptions,
  changedUpdates,
  isSignedOff,
  lockedBySignOff,
} from './lineAuthorisation';

describe('line authorisation in the line editor', () => {
  it('treats Passed and Rejected as the sign-off', () => {
    expect(isSignedOff('PASSED')).toBe(true);
    expect(isSignedOff('REJECTED')).toBe(true);
    expect(isSignedOff('PENDING')).toBe(false);
    expect(isSignedOff(null)).toBe(false);
  });

  it('OMS-FUN-ISE-001.12: offers every state, a new batch included, to a user who can authorise', () => {
    expect(authStatusOptions(true, null)).toEqual([
      'PENDING',
      'PASSED',
      'REJECTED',
    ]);
    expect(authStatusOptions(true, 'PASSED')).toEqual([
      'PENDING',
      'PASSED',
      'REJECTED',
    ]);
  });

  it('OMS-FUN-ISE-001.15 / .16: offers anyone else Pending, plus the state the batch was saved with', () => {
    expect(authStatusOptions(false, null)).toEqual(['PENDING']);
    expect(authStatusOptions(false, 'PENDING')).toEqual(['PENDING']);
    expect(authStatusOptions(false, 'PASSED')).toEqual(['PENDING', 'PASSED']);
    expect(authStatusOptions(false, 'REJECTED')).toEqual([
      'PENDING',
      'REJECTED',
    ]);
  });

  it('OMS-FUN-ISE-001.15 / .16: closes a signed-off batch to a user who cannot authorise, until it is back at Pending', () => {
    expect(lockedBySignOff(false, 'PASSED')).toBe(true);
    expect(lockedBySignOff(false, 'REJECTED')).toBe(true);
    expect(lockedBySignOff(false, 'PENDING')).toBe(false);
    expect(lockedBySignOff(false, null)).toBe(false);
    expect(lockedBySignOff(true, 'PASSED')).toBe(false);
  });

  it('OMS-FUN-ISE-001.14: sends only the batches that changed since they were loaded', () => {
    const passed = { id: 'a', batch: 'A1', status: 'PASSED' };
    const pending = { id: 'b', batch: 'B1', status: 'PENDING' };
    const loaded = new Map([
      ['a', JSON.stringify(passed)],
      ['b', JSON.stringify(pending)],
    ]);
    expect(changedUpdates([passed, pending], loaded)).toEqual([]);
    const edited = { ...pending, batch: 'B2' };
    expect(changedUpdates([passed, edited], loaded)).toEqual([edited]);
    // A batch the editor never recorded is sent, rather than dropped.
    const unknown = { id: 'c', batch: 'C1', status: 'PENDING' };
    expect(changedUpdates([unknown], loaded)).toEqual([unknown]);
  });
});
