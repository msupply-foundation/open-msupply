import { describe, it, expect } from 'vitest';
import {
  ancillaryRatio,
  courseTitle,
  populationSteps,
  principalItemLabel,
  type AncillaryRatioPrincipal,
  type PopulationCourse,
} from './forecast';

// The forecast block's display arithmetic (spec/internal-orders S4 › the
// forecast; rules › the Population method, the Ancillary ratio method). The
// forecast itself is the server's (behavioural acceptance lives in the e2e/
// suites, OMS-REG-REPL-11 / OMS-REG-REPL-17); these cover how its stored
// figures are substituted into each step.

// Measles (General Population): population 10 000, 2 doses, 60% coverage, 50%
// wastage → loss factor 2.0, 24 000 doses a year; 2 doses per unit → 2 000
// doses and 1 000 units a month.
const measles: PopulationCourse = {
  courseName: 'Measles',
  demographicName: 'General Population',
  numberOfDoses: 2,
  coverageRate: 60,
  wastageRate: 50,
  targetPopulation: 10000,
  lossFactor: 2,
  annualTargetDoses: 24000,
  dosesPerUnit: 2,
  monthlyDoses: 2000,
  monthlyUnits: 1000,
};

describe('OMS-REG-REPL-11.11 — each course walks annual target doses → monthly units', () => {
  it('walks annual target doses, then monthly units', () => {
    const [annual, monthly] = populationSteps(measles);
    expect(annual.substitution).toBe('10,000 × 2 × (60 / 100) × 2');
    expect(annual.result).toContain('= 24,000');
    expect(monthly.substitution).toBe('24,000 / 12 / 2');
    expect(monthly.result).toContain('= 1,000');
  });

  it('keeps monthly units to two decimals rather than rounding up', () => {
    const [, monthly] = populationSteps({
      ...measles,
      annualTargetDoses: 6666.666666666667,
      lossFactor: 1.1111111111111112,
      monthlyUnits: 277.77777777777777,
    });
    expect(monthly.substitution).toBe('6,666.67 / 12 / 2');
    expect(monthly.result).toContain('= 277.78');
  });
});

describe('courseTitle', () => {
  it('names the demographic in parentheses', () => {
    expect(courseTitle(measles)).toBe('Measles (General Population)');
  });

  it('is the bare course name for the whole population', () => {
    expect(courseTitle({ ...measles, demographicName: null })).toBe('Measles');
  });
});

describe('OMS-REG-REPL-17.13 — each principal shows its item and ratio', () => {
  const principal: AncillaryRatioPrincipal = {
    itemId: 'vaccine',
    item: { code: 'VAC1', name: 'Vaccine', unitName: 'Vial' },
    principalMonthlyConsumption: 100,
    itemQuantity: 100,
    ancillaryQuantity: 1,
    monthlyConsumption: 1,
  };

  it('shows the ratio as ancillary : principal', () => {
    expect(ancillaryRatio(principal)).toBe('1 : 100');
  });

  it('names the principal item by code and name, else its id', () => {
    expect(principalItemLabel(principal)).toBe('VAC1 Vaccine');
    expect(principalItemLabel({ ...principal, item: null })).toBe('vaccine');
  });
});
