import { describe, expect, it } from 'vitest';
import { indicatorSeedArgs, type IndicatorSeedSource } from './printing';

// A node inside the gate: non-emergency program order from a store-backed
// supplier. Each test flips one leg.
const qualifying: IndicatorSeedSource = {
  program: { id: 'program-a' },
  period: { id: 'period-1', name: '2026-07' },
  isEmergency: false,
  otherParty: {
    id: 'name-1',
    name: 'Supplier',
    code: 'SUP',
    isOnHold: false,
    store: { id: 'store-2', isDisabled: false },
  },
};

describe('AC-PR4 — indicator seeds accompany a program order’s generate', () => {
  it('seeds the program, its period, and the active store’s own customer identity inside the gate', () => {
    expect(indicatorSeedArgs(qualifying, true, 'own-name-id')).toEqual({
      programId: 'program-a',
      periodId: 'period-1',
      customerNameId: 'own-name-id',
    });
  });

  it('sends nothing for a general order (no program)', () => {
    expect(
      indicatorSeedArgs(
        { ...qualifying, program: null, period: null },
        true,
        'own-name-id'
      )
    ).toBeUndefined();
  });

  it('sends nothing for an emergency program order', () => {
    expect(
      indicatorSeedArgs({ ...qualifying, isEmergency: true }, true, 'own-name-id')
    ).toBeUndefined();
  });

  it('sends nothing when the supplier is not store-backed', () => {
    expect(
      indicatorSeedArgs(
        {
          ...qualifying,
          otherParty: { ...qualifying.otherParty, store: null },
        },
        true,
        'own-name-id'
      )
    ).toBeUndefined();
  });

  it('sends nothing when the program defines no indicators', () => {
    expect(indicatorSeedArgs(qualifying, false, 'own-name-id')).toBeUndefined();
  });

  it('sends nothing while the store’s own identity is unresolved', () => {
    expect(indicatorSeedArgs(qualifying, true, undefined)).toBeUndefined();
  });
});
