import { describe, expect, it } from 'vitest';
import type { AllocateUnit, IssueWarning } from '../../../../domain/allocation';
import { issueWarningMessages } from './allocationWarnings';

describe('issueWarningMessages (OMS-REG-SMV-11.7/.11/.13)', () => {
  const units: AllocateUnit = { kind: 'units' };

  it('surfaces over-allocation as total-vs-requested (OMS-REG-SMV-11.11)', () => {
    const derived: IssueWarning[] = [{ kind: 'over-allocated', units: 5 }];
    expect(issueWarningMessages(derived, 10, units)).toEqual([
      { key: 'messages.over-allocated', quantity: 15, issueQuantity: 10 },
    ]);
  });

  it('reports every skipped category, reusing the ported label tokens (OMS-REG-SMV-11.7)', () => {
    const derived: IssueWarning[] = [
      {
        kind: 'skipped-barred',
        reasons: ['on-hold', 'expired', 'unusable-vvm'],
      },
    ];
    expect(issueWarningMessages(derived, 0, units)).toEqual([
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

  it('reports a single skip reason', () => {
    const derived: IssueWarning[] = [
      { kind: 'skipped-barred', reasons: ['on-hold'] },
    ];
    expect(issueWarningMessages(derived, 0, units)).toEqual([
      {
        key: 'messages.allocated-lines-skipped-line-reasons',
        reasons: ['label.on-hold'],
      },
    ]);
  });

  // The editor derives a shortfall only past NEW (while NEW it is the
  // placeholder notice): it reports what WAS allocated, in the entry lens.
  it('reports a shortfall as the allocated total, in units (OMS-REG-SMV-11.13)', () => {
    const derived: IssueWarning[] = [{ kind: 'shortfall', units: 6 }];
    expect(issueWarningMessages(derived, 20, units)).toEqual([
      { key: 'warning.cannot-create-placeholder-units', allocatedQuantity: 14 },
    ]);
  });

  it('reports a shortfall in packs under the packs lens', () => {
    const derived: IssueWarning[] = [{ kind: 'shortfall', units: 40 }];
    expect(
      issueWarningMessages(derived, 100, { kind: 'packs', size: 10 })
    ).toEqual([
      { key: 'warning.cannot-create-placeholder-packs', allocatedQuantity: 6 },
    ]);
  });

  it('reports a shortfall in doses under the doses lens', () => {
    const derived: IssueWarning[] = [{ kind: 'shortfall', units: 2 }];
    expect(
      issueWarningMessages(derived, 5, { kind: 'doses', dosesPerUnit: 10 })
    ).toEqual([
      { key: 'warning.cannot-create-placeholder-doses', allocatedQuantity: 30 },
    ]);
  });

  it('combines over-allocation and skipped categories', () => {
    const derived: IssueWarning[] = [
      { kind: 'over-allocated', units: 2 },
      { kind: 'skipped-barred', reasons: ['expired'] },
    ];
    expect(issueWarningMessages(derived, 8, units)).toEqual([
      { key: 'messages.over-allocated', quantity: 10, issueQuantity: 8 },
      {
        key: 'messages.allocated-lines-skipped-line-reasons',
        reasons: ['label.expired'],
      },
    ]);
  });

  it('produces no banners for an empty result', () => {
    expect(issueWarningMessages([], 5, units)).toEqual([]);
  });
});
