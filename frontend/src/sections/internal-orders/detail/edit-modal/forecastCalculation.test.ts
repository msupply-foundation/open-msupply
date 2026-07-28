import { describe, it, expect } from 'vitest';
import {
  parseVaccineCourses,
  forecastSteps,
  type VaccineCourse,
} from './internalOrderLineEdit';

// The population-forecast calculation display's arithmetic (spec/internal-orders
// S4 § Population-based forecasting, AC-PF7). The forecast itself is captured
// server-side (behavioural acceptance lives in the e2e/ suites); these cover the
// client-side parse of the stored vaccineCourses JSON and the per-course figure
// substitution the editor walks step by step. The fixtures are the exact JSON
// the demo General store's Vaccine1 line carries (population 10 000, supply
// interval 3, buffer 2, doses-per-unit 2), covered by two Measles courses.

// Measles (General Population): 2 doses, 60% coverage, 50% wastage → loss 2.0.
const generalPopulation: VaccineCourse = {
  courseTitle: 'Measles (General Population)',
  numberOfDoses: 2,
  coverageRate: 60,
  targetPopulation: 10000,
  wastageRate: 50,
  lossFactor: 2,
  annualTargetDoses: 24000,
  bufferStockMonths: 2,
  supplyPeriodMonths: 3,
  dosesPerUnit: 2,
  forecastDoses: 10000,
  forecastUnits: 5000,
};

// Measles Booster (demographic-less → empty parentheses): 1 dose, 100%
// coverage, 0% wastage → loss 1.0.
const booster: VaccineCourse = {
  courseTitle: 'Measles Booster ()',
  numberOfDoses: 1,
  coverageRate: 100,
  targetPopulation: 10000,
  wastageRate: 0,
  lossFactor: 1,
  annualTargetDoses: 10000,
  bufferStockMonths: 2,
  supplyPeriodMonths: 3,
  dosesPerUnit: 2,
  forecastDoses: 4166.666666666667,
  forecastUnits: 2083.3333333333335,
};

const asJson = JSON.stringify([generalPopulation, booster]);

describe('AC-PF7 — parsing the stored vaccineCourses JSON', () => {
  it('parses the serialised array into its per-course groups', () => {
    const courses = parseVaccineCourses(asJson);
    expect(courses).toHaveLength(2);
    expect(courses[0]!.courseTitle).toBe('Measles (General Population)');
    // A demographic-less course keeps its empty parentheses (captured as-is).
    expect(courses[1]!.courseTitle).toBe('Measles Booster ()');
  });

  it('yields no courses for a forecast-less line (null) — the charts stand', () => {
    expect(parseVaccineCourses(null)).toEqual([]);
    expect(parseVaccineCourses('')).toEqual([]);
  });

  it('yields no courses for malformed or non-array JSON rather than throwing', () => {
    expect(parseVaccineCourses('not json')).toEqual([]);
    expect(parseVaccineCourses('{"not":"an array"}')).toEqual([]);
  });
});

describe('AC-PF7 — the three calculation steps substitute the stored figures', () => {
  it('step 1: annual target doses = population × doses × (coverage/100) × loss', () => {
    const [annual] = forecastSteps(generalPopulation);
    // 10,000 × 2 × (60/100) × 2 = 24,000 doses per year.
    expect(annual.substitution).toBe('10,000 × 2 × (60 / 100) × 2');
    expect(annual.result).toContain('= 24,000');
  });

  it('step 2: forecast doses = annual/12 × (supply + buffer months)', () => {
    const [, doses] = forecastSteps(generalPopulation);
    // (24,000 / 12) × (3 + 2) = 10,000 doses.
    expect(doses.substitution).toBe('(24,000 / 12) × (3 + 2)');
    expect(doses.result).toContain('= 10,000');
  });

  it('step 3: forecast units = forecast doses ÷ doses per unit, rounded up', () => {
    const [, , units] = forecastSteps(generalPopulation);
    // 10,000 / 2 = 5,000 units.
    expect(units.substitution).toBe('10,000 / 2');
    expect(units.result).toContain('= 5,000');
  });

  it('rounds the loss factor to 3 dp and the units result up to a whole unit', () => {
    const [annual, , units] = forecastSteps(booster);
    // Loss factor 1.0 shows without spurious decimals.
    expect(annual.substitution).toBe('10,000 × 1 × (100 / 100) × 1');
    // forecast doses 4,166.67 ÷ 2 doses-per-unit = 2,083.33 units → ceil → 2,084.
    expect(units.substitution).toBe('4,166.67 / 2');
    expect(units.result).toContain('= 2,084');
  });
});
