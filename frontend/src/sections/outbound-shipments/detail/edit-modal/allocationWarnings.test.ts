import { describe, expect, it } from 'vitest';
import type { IssueWarning } from '../../../../domain/allocation';
import { issueWarningMessages } from './allocationWarnings';

describe('issueWarningMessages (AC-AL2/AL3)', () => {
  it('surfaces over-allocation as total-vs-requested (AC-AL3)', () => {
    const derived: IssueWarning[] = [{ kind: 'over-allocated', units: 5 }];
    expect(issueWarningMessages(derived, 10)).toEqual([
      { key: 'messages.over-allocated', quantity: 15, issueQuantity: 10 },
    ]);
  });

  it('reports every skipped category, reusing the ported label tokens (AC-AL2)', () => {
    const derived: IssueWarning[] = [
      {
        kind: 'skipped-barred',
        reasons: ['on-hold', 'expired', 'unusable-vvm'],
      },
    ];
    expect(issueWarningMessages(derived, 0)).toEqual([
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
    expect(issueWarningMessages(derived, 0)).toEqual([
      {
        key: 'messages.allocated-lines-skipped-line-reasons',
        reasons: ['label.on-hold'],
      },
    ]);
  });

  it('does not surface the shortfall here (it is the placeholder notice)', () => {
    const derived: IssueWarning[] = [{ kind: 'shortfall', units: 20 }];
    expect(issueWarningMessages(derived, 20)).toEqual([]);
  });

  it('combines over-allocation and skipped categories', () => {
    const derived: IssueWarning[] = [
      { kind: 'over-allocated', units: 2 },
      { kind: 'skipped-barred', reasons: ['expired'] },
    ];
    expect(issueWarningMessages(derived, 8)).toEqual([
      { key: 'messages.over-allocated', quantity: 10, issueQuantity: 8 },
      {
        key: 'messages.allocated-lines-skipped-line-reasons',
        reasons: ['label.expired'],
      },
    ]);
  });

  it('produces no banners for an empty result', () => {
    expect(issueWarningMessages([], 5)).toEqual([]);
  });
});
