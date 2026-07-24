import { describe, it, expect } from 'vitest';
import { dosesPerUnit, dosesCounted } from './doses';

// Unit tests for the client-side doses display (spec/stocktakes › store-
// preference gates, D58). Behavioural acceptance against the real backend
// lives in the e2e/ Playwright suites.

describe('dosesPerUnit (spec/stocktakes › store-preference gates, D58)', () => {
  it('is blank for a non-vaccine item', () => {
    expect(
      dosesPerUnit({ item: { isVaccine: false, doses: 5 }, packSize: 10 })
    ).toBe(null);
  });

  it('is blank when pack size is unknown', () => {
    expect(
      dosesPerUnit({ item: { isVaccine: true, doses: 5 }, packSize: null })
    ).toBe(null);
  });

  it('multiplies pack size by the configured doses-per-unit', () => {
    expect(
      dosesPerUnit({ item: { isVaccine: true, doses: 5 }, packSize: 10 })
    ).toBe(50);
  });

  it('treats an unconfigured (0) doses-per-unit as 1, not 0 (D58)', () => {
    expect(
      dosesPerUnit({ item: { isVaccine: true, doses: 0 }, packSize: 10 })
    ).toBe(10);
  });
});

describe('dosesCounted (spec/stocktakes › store-preference gates, D58)', () => {
  it('is blank before the line is counted', () => {
    expect(
      dosesCounted({
        item: { isVaccine: true, doses: 5 },
        packSize: 10,
        countedNumberOfPacks: null,
      })
    ).toBe(null);
  });

  it('is counted packs × doses-per-unit', () => {
    expect(
      dosesCounted({
        item: { isVaccine: true, doses: 5 },
        packSize: 10,
        countedNumberOfPacks: 3,
      })
    ).toBe(150);
  });

  it('tracks a live-edited count for a vaccine with no configured doses-per-unit, never pinned at 0 (D58)', () => {
    expect(
      dosesCounted({
        item: { isVaccine: true, doses: 0 },
        packSize: 10,
        countedNumberOfPacks: 3,
      })
    ).toBe(30);
    expect(
      dosesCounted({
        item: { isVaccine: true, doses: 0 },
        packSize: 10,
        countedNumberOfPacks: 7,
      })
    ).toBe(70);
  });
});
