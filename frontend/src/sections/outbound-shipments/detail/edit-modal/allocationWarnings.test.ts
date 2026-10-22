import { describe, expect, it } from 'vitest';
import type { AllocateUnit, IssueWarning } from '../../../../domain/allocation';
import { activityMismatch, issueWarningMessages } from './allocationWarnings';

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

describe('activityMismatch — issuing stock not held for the requested activity', () => {
  const batch = (numberOfPacks: number, campaignId?: string) => ({
    numberOfPacks,
    campaign: campaignId ? { id: campaignId } : null,
  });
  const measles = { id: 'c1', name: 'Measles 2026' };

  it('says nothing when the requisition asked for no activity', () => {
    expect(activityMismatch([batch(5, 'c2'), batch(3)], undefined)).toBe(
      undefined
    );
  });

  it('says nothing when every issued batch is held for it', () => {
    expect(activityMismatch([batch(5, 'c1'), batch(2, 'c1')], measles)).toBe(
      undefined
    );
  });

  it('counts a batch held for a DIFFERENT campaign', () => {
    expect(activityMismatch([batch(5, 'c2')], measles)).toEqual({
      activity: 'Measles 2026',
      batches: 1,
    });
  });

  // Routine stock is not campaign stock: the customer asked for one and would
  // be sent the other, which is exactly what the warning is for.
  it('counts a batch held for nothing in particular', () => {
    expect(activityMismatch([batch(5)], measles)).toEqual({
      activity: 'Measles 2026',
      batches: 1,
    });
  });

  it('ignores batches that are not being issued', () => {
    expect(activityMismatch([batch(0, 'c2'), batch(0)], measles)).toBe(
      undefined
    );
  });

  it('counts every offending issued batch, mixed with matching ones', () => {
    expect(
      activityMismatch(
        [batch(5, 'c1'), batch(2, 'c2'), batch(1), batch(0, 'c3')],
        measles
      )
    ).toEqual({ activity: 'Measles 2026', batches: 2 });
  });
});
