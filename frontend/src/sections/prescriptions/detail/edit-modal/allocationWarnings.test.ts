import { describe, expect, it } from 'vitest';
import {
  issueWarningMessages,
  manualEntryMessages,
} from './allocationWarnings';

describe('issueWarningMessages (stock-allocation § reporting → banner descriptors)', () => {
  it('maps every skipped category to its ported label (AC-AL2 — .59)', () => {
    expect(
      issueWarningMessages(
        [
          {
            kind: 'skipped-barred',
            reasons: ['on-hold', 'expired', 'unusable-vvm'],
          },
        ],
        { doses: false, dosesPerUnit: 1 }
      )
    ).toEqual([
      {
        key: 'messages.allocated-lines-skipped-line-reasons',
        reasons: [
          'label.on-hold',
          'label.expired',
          'label.unusable-vvm-status',
        ],
      },
    ]);
  });

  it('maps the split-pack warning to units (AC-AL12 — .58)', () => {
    expect(
      issueWarningMessages([{ kind: 'partial-packs', nearestAboveUnits: 30 }], {
        doses: false,
        dosesPerUnit: 2,
      })
    ).toEqual([
      { key: 'messages.partial-pack-warning-units', nearestAbove: 30 },
    ]);
  });

  it('converts the split-pack figure under the doses lens (.58)', () => {
    expect(
      issueWarningMessages([{ kind: 'partial-packs', nearestAboveUnits: 30 }], {
        doses: true,
        dosesPerUnit: 2,
      })
    ).toEqual([
      { key: 'messages.partial-pack-warning-doses', nearestAbove: 60 },
    ]);
  });

  it('drops over-allocation (never arises — .31) and the shortfall (its own banner)', () => {
    expect(
      issueWarningMessages(
        [
          { kind: 'over-allocated', units: 3 },
          { kind: 'shortfall', units: 5 },
        ],
        { doses: false, dosesPerUnit: 1 }
      )
    ).toEqual([]);
  });
});

describe('manualEntryMessages (a per-batch entry — AC-AL13, .19/.58)', () => {
  it('reports the applied quantity when the entry was adjusted', () => {
    expect(manualEntryMessages(12.1, 10, 900)).toEqual([
      {
        key: 'messages.over-allocated-line',
        quantity: 121,
        issueQuantity: 900,
      },
      { key: 'messages.partial-pack-warning-units', nearestAbove: 130 },
    ]);
  });

  it('reports only the split pack for an unadjusted fractional entry', () => {
    expect(manualEntryMessages(2.5, 10, 25)).toEqual([
      { key: 'messages.partial-pack-warning-units', nearestAbove: 30 },
    ]);
  });

  it('reports nothing for a whole-pack entry applied as typed', () => {
    expect(manualEntryMessages(2, 10, 20)).toEqual([]);
    expect(manualEntryMessages(2, 10)).toEqual([]);
  });

  it('float dust never fakes an adjustment (0.7 packs of 10 IS 7 units)', () => {
    expect(manualEntryMessages(0.7, 10, 7)).toEqual([
      { key: 'messages.partial-pack-warning-units', nearestAbove: 10 },
    ]);
  });
});
