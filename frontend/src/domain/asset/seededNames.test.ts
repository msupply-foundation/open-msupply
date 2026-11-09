import { describe, expect, it } from 'vitest';
import en from '@/intl/locales/en/common.json';
import { categoryName, reasonName, SEEDED, typeName } from './seededNames';

// Seeded cold chain reference data shows in the display language (issue
// #1307). Under node, t() answers the bare key, so a translated name reads
// as its key here.

describe('OMS-REG-I18N-01.36 — seeded cold chain names', () => {
  it('names a seeded row by its locale key', () => {
    expect(
      reasonName({
        id: '325c1a24-97eb-4597-885d-253a52430125',
        reason: 'Needs servicing',
      })
    ).toBe('reason.needs-servicing');
    expect(
      categoryName({
        id: '02cbea92-d5bf-4832-863b-c04e093a7760',
        name: 'Refrigerators and freezers',
      })
    ).toBe('asset-category.refrigerators-and-freezers');
    expect(
      typeName({
        id: 'fd79171f-5da8-4801-b299-9426f34310a8',
        name: 'Refrigerator',
      })
    ).toBe('asset-type.refrigerator');
  });

  it('still recognises the reason the server renamed in v3.4', () => {
    expect(
      reasonName({
        id: '2f734462-c76d-4b08-b8d2-40b250538d46',
        reason: 'Multiple temperature breaches',
      })
    ).toBe('reason.multi-temperature-breaches');
  });

  it('shows a renamed seeded row as it was named', () => {
    expect(
      reasonName({
        id: '44f648e9-2ff1-4010-be84-6bb6befce2d7',
        reason: 'In the shed',
      })
    ).toBe('In the shed');
  });

  it('shows a row someone added as stored', () => {
    expect(typeName({ id: 'custom', name: 'Refrigerator' })).toBe(
      'Refrigerator'
    );
  });

  it("matches every seeded name to its key's English", () => {
    const catalog = en as Record<string, string>;
    for (const table of Object.values(SEEDED))
      for (const { seeded, key } of Object.values(table))
        expect(catalog[key], key).toBe(seeded[0]);
  });
});
