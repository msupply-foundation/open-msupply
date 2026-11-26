import { describe, expect, it } from 'vitest';
import { hiddenReportCount, shownReports } from './shownFirst';

const report = (id: string, isDisplayed: boolean) => ({ id, isDisplayed });

describe('reports shown first (OMS-REG-RPT-07)', () => {
  const reports = [
    report('untagged', true),
    report('tagged-for-this-store', true),
    report('tagged-for-other-stores', false),
  ];

  it('lists only the displayed reports until Show more is pressed (OMS-REG-RPT-07.15, .16)', () => {
    expect(shownReports(reports, false).map(r => r.id)).toEqual([
      'untagged',
      'tagged-for-this-store',
    ]);
  });

  it('lists every report, in its original order, once expanded (OMS-REG-RPT-07.17)', () => {
    expect(shownReports(reports, true).map(r => r.id)).toEqual([
      'untagged',
      'tagged-for-this-store',
      'tagged-for-other-stores',
    ]);
  });

  it('counts the hidden reports for the button, and none when nothing is hidden (OMS-REG-RPT-07.17)', () => {
    expect(hiddenReportCount(reports)).toBe(1);
    expect(hiddenReportCount([report('a', true)])).toBe(0);
  });
});
