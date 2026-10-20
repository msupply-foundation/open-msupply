import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { setDictionaries, setLocale } from '../../intl/intl';
import commonEn from '../../intl/locales/en/common.json';
import {
  FORECAST_METHODS,
  ancillaryRatio,
  annualTargetFormulaKey,
  courseTitle,
  forecastMethodLabel,
  populationSteps,
  principalItemLabel,
  principalWastageDeduction,
  targetStockCaption,
  unavailableReasonMessage,
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
  annualDosesPerPerson: null,
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

  it('keeps monthly units to the configured places rather than rounding up', () => {
    const [, monthly] = populationSteps({
      ...measles,
      annualTargetDoses: 6666.666666666667,
      lossFactor: 1.1111111111111112,
      monthlyUnits: 277.77777777777777,
    });
    // A rounded figure in the sentence is marked (spec § display rounding).
    expect(monthly.substitution).toBe('6,666.67* / 12 / 2');
    expect(monthly.result).toContain('= 277.78*');
  });
});

describe("OMS-REG-REPL-11.16 — step 1 counts a course's doses per person per year only when it sets one", () => {
  // Td for pregnant women: 5 doses spread over about 2.5 pregnancies, so a
  // woman reached gets 2 a year.
  // 4 000 × 2 × (80 / 100) × 1 = 6 400 doses a year.
  const td: PopulationCourse = {
    courseName: 'Td',
    demographicName: 'Pregnant women',
    numberOfDoses: 5,
    coverageRate: 80,
    wastageRate: 0,
    targetPopulation: 4000,
    annualDosesPerPerson: 2,
    lossFactor: 1,
    annualTargetDoses: 6400,
    dosesPerUnit: 1,
    monthlyDoses: 533.3333333333334,
    monthlyUnits: 533.3333333333334,
  };

  it('puts the doses per person per year into step 1 and its formula', () => {
    const [annual] = populationSteps(td);
    expect(annual.substitution).toBe('4,000 × 2 × (80 / 100) × 1');
    expect(annualTargetFormulaKey(td)).toBe(
      'description.annual-target-doses-calculation-with-doses-per-person'
    );
  });

  it('leaves a course counting every dose as it was', () => {
    const [annual] = populationSteps(measles);
    expect(annual.substitution).toBe('10,000 × 2 × (60 / 100) × 2');
    expect(annualTargetFormulaKey(measles)).toBe(
      'description.annual-target-doses-calculation'
    );
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
    wastageRate: 0,
    principalUsableConsumption: 100,
    monthlyConsumption: 1,
  };

  it('shows the ratio as ancillary : principal', () => {
    expect(ancillaryRatio(principal)).toBe('1 : 100');
  });

  // Rules › the Ancillary ratio method: a link that excludes the principal's
  // wastage shows the deduction; one ordering for the wasted units shows none.
  it('shows the wastage deducted, only when there is some', () => {
    setDictionaries({ en: commonEn });
    setLocale('en');
    expect(principalWastageDeduction(principal)).toBeUndefined();
    expect(
      principalWastageDeduction({
        ...principal,
        wastageRate: 50,
        principalUsableConsumption: 50,
        monthlyConsumption: 0.5,
      })
    ).toBe('− 50% wastage');
    setDictionaries({});
  });

  it('names the principal item by code and name, else its id', () => {
    expect(principalItemLabel(principal)).toBe('VAC1 Vaccine');
    expect(principalItemLabel({ ...principal, item: null })).toBe('vaccine');
  });
});

describe("OMS-REG-REPL-17.17 — target months from the store's supply interval + safety buffer show their make-up", () => {
  beforeAll(() => {
    setDictionaries({ en: commonEn });
    setLocale('en');
  });
  afterAll(() => setDictionaries({}));

  it('reads monthly demand × target months', () => {
    expect(targetStockCaption('120 units', 2)).toBe('120 units × 2 months');
  });

  it('reads a one-month target in the singular', () => {
    expect(targetStockCaption('120 units', 1)).toBe('120 units × 1 month');
  });

  it('names the supply interval and safety buffer behind a supply-interval-and-buffer target', () => {
    expect(
      targetStockCaption('120 units', 3.5, {
        supplyIntervalMonths: 3,
        safetyBufferMonths: 0.5,
      })
    ).toBe('120 units × 3.5 months (supply interval 3 + safety buffer 0.5)');
  });
});

describe('OMS-REG-REPL-17.5 — the method select names each method and why one is unavailable', () => {
  beforeAll(() => {
    setDictionaries({ en: commonEn });
    setLocale('en');
  });
  afterAll(() => setDictionaries({}));

  it('labels the three methods in select order', () => {
    expect(FORECAST_METHODS.map(forecastMethodLabel)).toEqual([
      'AMC',
      'Population',
      'Ancillary ratio',
    ]);
  });

  it('gives each unavailable reason its own message', () => {
    expect(unavailableReasonMessage('POPULATION_PREFERENCE_OFF')).toBe(
      commonEn['messages.forecast-method-unavailable-population-preference']
    );
    expect(unavailableReasonMessage('NO_POPULATION_SERVED')).toBe(
      commonEn['messages.forecast-method-unavailable-no-population-served']
    );
    expect(unavailableReasonMessage('NO_VACCINE_COURSE')).toBe(
      commonEn['messages.forecast-method-unavailable-no-vaccine-course']
    );
    expect(unavailableReasonMessage('NO_PRINCIPAL_ON_ORDER')).toBe(
      commonEn['messages.forecast-method-unavailable-no-principal']
    );
  });
});
