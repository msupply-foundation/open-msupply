import { describe, expect, it } from 'vitest';
import { resolveStoreToEnter } from './resolveStoreToEnter';

/*
 * Guard-2 resolution priority (spec/startup rules § SL-2/SL-9;
 * OMS-REG-LGN-02.1, .2, .25–.27): URL store → single store → always-open
 * store (sign-in only) → none (the selection screen).
 */
describe('resolveStoreToEnter', () => {
  const a = { id: 'a' };
  const b = { id: 'b' };

  it('a URL store in the list wins over everything (.1)', () => {
    expect(resolveStoreToEnter([a, b], 'b', 'a', false)).toBe(b);
    expect(resolveStoreToEnter([a, b], 'b', 'a', true)).toBe(b);
  });

  it('a single store auto-enters whatever else is set (.2)', () => {
    expect(resolveStoreToEnter([a], undefined, undefined, false)).toBe(a);
    expect(resolveStoreToEnter([a], 'nope', 'b', true)).toBe(a);
  });

  it('the always-open store enters at sign-in — before any store this session (.25)', () => {
    expect(resolveStoreToEnter([a, b], undefined, 'b', false)).toBe(b);
  });

  it('the always-open store never bypasses an explicit switch — a store is already entered (.26)', () => {
    expect(resolveStoreToEnter([a, b], undefined, 'b', true)).toBeUndefined();
  });

  it('a saved store no longer in the list is ignored (.27)', () => {
    expect(
      resolveStoreToEnter([a, b], undefined, 'gone', false)
    ).toBeUndefined();
  });

  it('no signals at all resolves nothing — the selection screen shows (.3)', () => {
    expect(
      resolveStoreToEnter([a, b], undefined, undefined, false)
    ).toBeUndefined();
  });
});
