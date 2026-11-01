import { describe, expect, it } from 'vitest';
import type { IssueWarning } from '@/domain/allocation';
import {
  issueWarningMessages,
  manualEntryMessages,
  reportsExpiredSkip,
} from './allocationWarnings';

const units = { doses: false, dosesPerUnit: 1 };
const short = { met: false, expiredIssuable: true };

describe('issueWarningMessages (stock-allocation § reporting → banner descriptors)', () => {
  it('reports each skipped category as its own whole-sentence message (OMS-REG-SMV-11.7 — DIS-03.59)', () => {
    expect(
      issueWarningMessages(
        [
          {
            kind: 'skipped-barred',
            reasons: ['on-hold', 'expired', 'unusable-vvm'],
          },
        ],
        units,
        short
      )
    ).toEqual([
      { key: 'messages.stock-on-hold' },
      { key: 'messages.stock-expired' },
      { key: 'messages.stock-unusable-vvm' },
    ]);
  });

  it('reports only the categories that applied (.59)', () => {
    expect(
      issueWarningMessages(
        [{ kind: 'skipped-barred', reasons: ['expired'] }],
        units,
        short
      )
    ).toEqual([{ key: 'messages.stock-expired' }]);
  });

  it('a met request warns against picking the expired stock (DIS-03.76)', () => {
    expect(
      issueWarningMessages(
        [{ kind: 'skipped-barred', reasons: ['expired', 'unusable-vvm'] }],
        units,
        { met: true, expiredIssuable: true }
      )
    ).toEqual([
      { key: 'messages.stock-expired-skipped' },
      { key: 'messages.stock-unusable-vvm' },
    ]);
  });

  it('a short request under the expired guard says the stock cannot be issued (.77)', () => {
    expect(
      issueWarningMessages(
        [{ kind: 'skipped-barred', reasons: ['expired'] }],
        units,
        { met: false, expiredIssuable: false }
      )
    ).toEqual([{ key: 'messages.stock-expired-cannot-issue' }]);
  });

  it('maps the split-pack warning to units (OMS-REG-SMV-11.32 — DIS-03.58)', () => {
    expect(
      issueWarningMessages(
        [{ kind: 'partial-packs', nearestAboveUnits: 30 }],
        {
          doses: false,
          dosesPerUnit: 2,
        },
        short
      )
    ).toEqual([
      { key: 'messages.partial-pack-warning-units', nearestAbove: 30 },
    ]);
  });

  it('converts the split-pack figure under the doses lens (.58)', () => {
    expect(
      issueWarningMessages(
        [{ kind: 'partial-packs', nearestAboveUnits: 30 }],
        {
          doses: true,
          dosesPerUnit: 2,
        },
        short
      )
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
        units,
        short
      )
    ).toEqual([]);
  });
});

describe('reportsExpiredSkip (what opens the Batches section — DIS-03.75)', () => {
  it('opens it the same under the doses lens', () => {
    const doses = { doses: true, dosesPerUnit: 10 };
    const skipped: IssueWarning[] = [
      { kind: 'skipped-barred', reasons: ['expired'] },
    ];
    for (const outcome of [short, { met: true, expiredIssuable: true }])
      expect(
        reportsExpiredSkip(issueWarningMessages(skipped, doses, outcome))
      ).toBe(reportsExpiredSkip(issueWarningMessages(skipped, units, outcome)));
    expect(
      issueWarningMessages(skipped, doses, { met: true, expiredIssuable: true })
    ).toEqual([{ key: 'messages.stock-expired-skipped' }]);
  });

  it('is set by any expired sentence', () => {
    for (const key of [
      'messages.stock-expired',
      'messages.stock-expired-skipped',
      'messages.stock-expired-cannot-issue',
    ] as const)
      expect(reportsExpiredSkip([{ key }])).toBe(true);
  });

  it('is not set by unusable-VVM stock or the pack warnings', () => {
    expect(
      reportsExpiredSkip([
        { key: 'messages.stock-unusable-vvm' },
        { key: 'messages.partial-pack-warning-units', nearestAbove: 10 },
      ])
    ).toBe(false);
  });
});

describe('manualEntryMessages (a per-batch entry — OMS-REG-SMV-11.33/.34, DIS-03.19/.58)', () => {
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
