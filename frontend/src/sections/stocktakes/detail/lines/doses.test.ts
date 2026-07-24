import { describe, expect, it } from 'vitest';
import { dosesPerUnit, dosesCounted, type DosesLine } from './doses';

// Anchor: spec/stocktakes/cases/OMS-REG-INV-03.64 — with the vaccine-doses
// preference on, dose equivalents display for vaccine items' counts (and
// nowhere when it is off). The preference gate + rendering are exercised
// elsewhere; here we pin the pure per-line dose formula that feeds it:
//   doses-per-unit = packSize × item.doses; doses-counted = counted × that.
// A null result is what the column renders blank, so the null cases below are
// the "nowhere" half of the behaviour for a non-vaccine line.

const line = (over: Partial<DosesLine> = {}): DosesLine => ({
  item: { isVaccine: true, doses: 2 },
  packSize: 10,
  countedNumberOfPacks: 3,
  ...over,
});

describe('OMS-REG-INV-03.64 — dose equivalents', () => {
  it('doses-per-unit is packSize × item.doses for a vaccine line', () => {
    expect(
      dosesPerUnit(line({ packSize: 10, item: { isVaccine: true, doses: 2 } }))
    ).toBe(20);
  });

  it('doses-counted is counted packs × doses-per-unit', () => {
    expect(dosesCounted(line({ countedNumberOfPacks: 3 }))).toBe(60);
  });

  it('is blank (null) for a non-vaccine item', () => {
    const nonVaccine = line({ item: { isVaccine: false, doses: 2 } });
    expect(dosesPerUnit(nonVaccine)).toBeNull();
    expect(dosesCounted(nonVaccine)).toBeNull();
  });

  it('is blank (null) when the pack size is unknown', () => {
    expect(dosesPerUnit(line({ packSize: null }))).toBeNull();
    expect(dosesCounted(line({ packSize: null }))).toBeNull();
  });

  it('doses-counted is blank (null) while the line is uncounted', () => {
    expect(dosesCounted(line({ countedNumberOfPacks: null }))).toBeNull();
  });

  it('doses-counted is 0 for a zero count on a vaccine line', () => {
    expect(dosesCounted(line({ countedNumberOfPacks: 0 }))).toBe(0);
  });
});
