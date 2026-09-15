import { describe, expect, it } from 'vitest';
import {
  BASE_YEAR,
  GENERAL_ROW_ID,
  ZERO_RATES,
  baselineOf,
  currentPopulation,
  newIndicator,
  pinGeneralFirst,
  projectYears,
  projectionWrite,
  ratesOf,
  saveInputs,
  toDraft,
  toInsertInput,
  type Draft,
  type GrowthRates,
  type Indicator,
  type ProjectionNode,
} from './draft';

// The calculation, the grid order and the save inputs — the rules in domain
// terms, asserted on the pure module the editor and the page ride on.
//
// Behaviour anchors: spec/demographics/cases/OMS-REG-MNG-03 (behaviour ids,
// cited as `.n`; the former AC-* ids map to them in acceptance.md).

const indicator = (
  id: string,
  name: string,
  populationPercentage: number,
  baseYear = BASE_YEAR
): Indicator => ({
  id,
  name,
  baseYear,
  basePopulation: 0,
  populationPercentage,
  year1Projection: 0,
  year2Projection: 0,
  year3Projection: 0,
  year4Projection: 0,
  year5Projection: 0,
});

const general = (basePopulation: number): Indicator => ({
  ...indicator(GENERAL_ROW_ID, 'General Population', 100),
  basePopulation,
});

const tenPercent: GrowthRates = {
  year1: 10,
  year2: 10,
  year3: 10,
  year4: 10,
  year5: 10,
};

const projection = (rates: GrowthRates): ProjectionNode => ({
  __typename: 'DemographicProjectionNode',
  id: 'proj-2024',
  baseYear: BASE_YEAR,
  ...rates,
});

describe('the calculation (rules § the calculation)', () => {
  it('OMS-REG-MNG-03.21 — current population is the baseline scaled by the share, to a whole person', () => {
    expect(currentPopulation(1000, 33.33)).toBe(333);
  });

  it('OMS-REG-MNG-03.21 — each year compounds on the previous year’s ROUNDED figure', () => {
    // 1 000 at 10 % every year: 1 610, not the 1 611 that unrounded
    // compounding gives.
    expect(projectYears(1000, tenPercent)).toEqual([
      1100, 1210, 1331, 1464, 1610,
    ]);
  });

  it('OMS-REG-MNG-03.21 — a 33.33 % row at the same rates', () => {
    expect(projectYears(currentPopulation(1000, 33.33), tenPercent)).toEqual([
      366, 403, 443, 487, 536,
    ]);
  });

  it('OMS-REG-MNG-03.19 / OMS-REG-MNG-03.23 — zero rates project flat', () => {
    expect(projectYears(500, ZERO_RATES)).toEqual([500, 500, 500, 500, 500]);
  });

  it('OMS-REG-MNG-03.4 — a later year’s rate leaves the earlier years alone', () => {
    const years = projectYears(1000, { ...ZERO_RATES, year3: 10 });
    expect(years).toEqual([1000, 1000, 1100, 1100, 1100]);
  });

  it('OMS-REG-MNG-03.24 — a negative share reads as negative figures', () => {
    const current = currentPopulation(1000, -5);
    expect(current).toBe(-50);
    expect(projectYears(current, tenPercent)[0]).toBe(-55);
  });

  it('never leaves a negative zero behind', () => {
    expect(Object.is(currentPopulation(0, -5), -0)).toBe(false);
    expect(currentPopulation(0, -5)).toBe(0);
  });

  it('the general population row’s current population IS the baseline', () => {
    expect(currentPopulation(1234567, 100)).toBe(1234567);
    expect(baselineOf([general(1234567), indicator('a', 'A', 10)])).toBe(
      1234567
    );
  });
});

describe('the grid order (rules § the grid)', () => {
  it('OMS-REG-MNG-03.16 — pins the general population row first and keeps the read’s order for the rest', () => {
    const fetched = [
      indicator('a', 'Adults', 60),
      indicator('c', 'children', 30),
      general(1000),
      indicator('p', 'Pregnant women', 4),
    ];
    expect(pinGeneralFirst(fetched).map(row => row.id)).toEqual([
      GENERAL_ROW_ID,
      'a',
      'c',
      'p',
    ]);
  });

  it('seeds every loaded row clean, with the stored rates and record id', () => {
    const draft = toDraft(
      [indicator('a', 'Adults', 60), general(1000)],
      projection(tenPercent)
    );
    expect(draft.indicators.map(row => row.id)).toEqual([GENERAL_ROW_ID, 'a']);
    expect(draft.indicators.every(row => !row.isNew)).toBe(true);
    expect(draft.rates).toEqual(tenPercent);
    expect(draft.projectionId).toBe('proj-2024');
  });

  it('OMS-REG-MNG-03.19 — no stored record reads as zero rates and no record id', () => {
    expect(ratesOf(undefined)).toEqual(ZERO_RATES);
    const draft = toDraft([general(0)], undefined);
    expect(draft.rates).toEqual(ZERO_RATES);
    expect(draft.projectionId).toBeUndefined();
  });

  it('OMS-REG-MNG-03.2 — stored rates reach the headers as stored, out-of-range or not', () => {
    // OMS-REG-MNG-03.38: the server validates no range, so a record another client wrote
    // can carry a negative rate or one above 100 — shown and used as-is.
    const rates = { ...ZERO_RATES, year1: -5, year2: 250.5 };
    expect(ratesOf(projection(rates))).toEqual(rates);
  });
});

describe('new indicator (rules § editing the draft, § indicators)', () => {
  it('OMS-REG-MNG-03.11 — a blank editable row: no name, 0 % share, unsaved', () => {
    const row = newIndicator('new-1', BASE_YEAR);
    expect(row).toMatchObject({
      id: 'new-1',
      name: '',
      populationPercentage: 0,
      baseYear: BASE_YEAR,
      isNew: true,
    });
    expect(currentPopulation(1000, row.populationPercentage)).toBe(0);
  });

  it('a new row takes the base year of the FIRST indicator in the read’s name order', () => {
    // Not necessarily the general population row (captured as-is).
    const draft = toDraft(
      [indicator('a', 'Adults', 60, 2025), general(1000)],
      undefined
    );
    expect(draft.newRowBaseYear).toBe(2025);
    expect(toDraft([], undefined).newRowBaseYear).toBe(BASE_YEAR);
  });
});

describe('what a save sends (rules § saving the draft; contract § indicators)', () => {
  const draft = (): Draft => ({
    indicators: [
      { ...general(1000), isNew: false },
      { ...indicator('a', 'Adults', 60), isNew: false },
      {
        ...newIndicator('new-1', BASE_YEAR),
        name: 'Children',
        populationPercentage: 30,
      },
      { ...newIndicator('new-2', BASE_YEAR), name: '   ' },
    ],
    rates: tenPercent,
    projectionId: 'proj-2024',
    newRowBaseYear: BASE_YEAR,
  });

  it('OMS-REG-MNG-03.40 — every existing row is written in full with the baseline as its base population and recomputed projections', () => {
    const { updates } = saveInputs(draft(), 'General population', () => 'x');
    expect(updates.map(u => u.id)).toEqual([GENERAL_ROW_ID, 'a']);
    expect(updates[1]).toEqual({
      id: 'a',
      name: 'Adults',
      baseYear: BASE_YEAR,
      basePopulation: 1000,
      populationPercentage: 60,
      year1Projection: 660,
      year2Projection: 726,
      year3Projection: 799,
      year4Projection: 879,
      year5Projection: 967,
    });
  });

  it('OMS-REG-MNG-03.35 — the general population row is written back under the screen’s own label', () => {
    const { updates } = saveInputs(draft(), 'Population générale', () => 'x');
    expect(updates[0]).toMatchObject({
      id: GENERAL_ROW_ID,
      name: 'Population générale',
      populationPercentage: 100,
      basePopulation: 1000,
      year1Projection: 1100,
      year5Projection: 1610,
    });
  });

  it('OMS-REG-MNG-03.9 — a new row is created with the base year it was born with and its computed figures', () => {
    const { inserts } = saveInputs(draft(), 'General population', () => 'x');
    expect(inserts[0]).toEqual({
      id: 'new-1',
      name: 'Children',
      baseYear: BASE_YEAR,
      basePopulation: 1000,
      populationPercentage: 30,
      year1Projection: 330,
      year2Projection: 363,
      year3Projection: 399,
      year4Projection: 439,
      year5Projection: 483,
    });
  });

  it('OMS-REG-MNG-03.26 — a blank name is OMITTED from a create, never sent as ""', () => {
    // The server's no-name check fires only on an ABSENT name; `name: ""`
    // would create an indicator and a group both named "" (contract wire trap).
    const { inserts } = saveInputs(draft(), 'General population', () => 'x');
    expect(inserts[1]).not.toHaveProperty('name');
    expect(
      toInsertInput(newIndicator('n', BASE_YEAR), 0, ZERO_RATES)
    ).not.toHaveProperty('name');
  });

  it('OMS-REG-MNG-03.5 — the stored growth-rate record is updated with all five rates and the base year', () => {
    const { projection: write } = saveInputs(draft(), 'x', () => 'unused');
    expect(write).toEqual({
      kind: 'update',
      input: { id: 'proj-2024', baseYear: BASE_YEAR, ...tenPercent },
    });
  });

  it('OMS-REG-MNG-03.36 — with no record stored, the rates are CREATED under a fresh client id', () => {
    const write = projectionWrite(
      { ...draft(), projectionId: undefined },
      () => 'fresh-id'
    );
    expect(write).toEqual({
      kind: 'insert',
      input: { id: 'fresh-id', baseYear: BASE_YEAR, ...tenPercent },
    });
  });
});
