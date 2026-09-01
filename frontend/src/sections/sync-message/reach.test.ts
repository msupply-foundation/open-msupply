import { describe, expect, it } from 'vitest';
import { canReachRegister } from './reach';

// Anchors: spec/sync-message/cases/OMS-REG-MNG-05.
//   .1 — Manage › Sync message is offered only on a central server to a
//        session holding the Server Admin permission
// (rules.md § reach and visibility; the destination and its gate are specified
// once in spec/navigation › central administration destinations.)

describe('OMS-REG-MNG-05.1 — reach is central server AND server admin', () => {
  it('admits only the pair', () => {
    expect(canReachRegister(true, true)).toBe(true);
  });

  it('refuses a server admin on a non-central server', () => {
    expect(canReachRegister(false, true)).toBe(false);
  });

  it('refuses a non-admin on the central server', () => {
    expect(canReachRegister(true, false)).toBe(false);
  });

  it('refuses a session holding neither', () => {
    expect(canReachRegister(false, false)).toBe(false);
  });
});
