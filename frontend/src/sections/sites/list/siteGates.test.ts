import { describe, expect, it } from 'vitest';
import { siteAffordances } from './siteGates';

// Anchors: spec/sites/cases/OMS-FUN-SYC-002 (behaviours cited per describe).
// This is the spec's own deployment-gate table, so the tests read as that table.

const mixedCentral = {
  isStandalone: false,
  isExistingSite: true,
  pairingAvailable: true,
};
const standaloneCentral = { ...mixedCentral, isStandalone: true };

describe('OMS-FUN-SYC-002.12 — on a central server that is not standalone, no site can be created, edited or deleted, and the editor accepts no input', () => {
  it('withholds every identity, store and lifecycle affordance', () => {
    const gates = siteAffordances(mixedCentral);
    expect(gates.create).toBe(false);
    expect(gates.selection).toBe(false);
    expect(gates.identityEditable).toBe(false);
    expect(gates.password).toBe(false);
    expect(gates.storePicker).toBe(false);
    expect(gates.storeRemove).toBe(false);
    expect(gates.save).toBe(false);
    expect(gates.delete).toBe(false);
  });
});

describe('OMS-FUN-SYC-002.13 — on that same server the clear-hardware-id, clear-token and multi-device controls remain available', () => {
  it('keeps the pairing half available on a mixed central', () => {
    // The asymmetry IS the rule: the register is authored by the legacy central
    // above, but the pairing state is this server's own.
    expect(siteAffordances(mixedCentral).pairing).toBe(true);
  });

  it('still respects the pairing conditions themselves', () => {
    expect(
      siteAffordances({ ...mixedCentral, pairingAvailable: false }).pairing
    ).toBe(false);
  });

  it('offers no pairing control on a create — there is no site to pair yet', () => {
    expect(
      siteAffordances({ ...standaloneCentral, isExistingSite: false }).pairing
    ).toBe(false);
  });
});

describe('OMS-FUN-SYC-002.15 — on a standalone central the create action, row selection, and the editor save and delete are all present', () => {
  it('offers the whole write half', () => {
    const gates = siteAffordances(standaloneCentral);
    expect(gates.create).toBe(true);
    expect(gates.selection).toBe(true);
    expect(gates.identityEditable).toBe(true);
    expect(gates.password).toBe(true);
    expect(gates.storePicker).toBe(true);
    expect(gates.storeRemove).toBe(true);
    expect(gates.save).toBe(true);
    expect(gates.delete).toBe(true);
  });

  it('withholds Delete on a create — existing sites only', () => {
    expect(
      siteAffordances({ ...standaloneCentral, isExistingSite: false }).delete
    ).toBe(false);
  });

  it('still offers Save on a create — that is what a create is', () => {
    expect(
      siteAffordances({ ...standaloneCentral, isExistingSite: false }).save
    ).toBe(true);
  });
});
