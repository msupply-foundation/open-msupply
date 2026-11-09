import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { setDictionaries, setLocale } from '../../intl/intl';
import commonEn from '../../intl/locales/en/common.json';
import {
  FORECAST_METHODS,
  ancillaryRatio,
  courseTitle,
  forecastMethodLabel,
  isOperator,
  populationSteps,
  principalItemLabel,
  principalSteps,
  targetStockCaption,
  unavailableReasonMessage,
  type AncillaryRatioPrincipal,
  type CalculationStep,
  type PopulationCourse,
} from './forecast';

// The forecast block's display arithmetic (spec/internal-orders S4 › the
// forecast; rules › the Population method, the Ancillary ratio method). The
// forecast itself is the server's (behavioural acceptance lives in the e2e/
// suites, OMS-REG-REPL-11 / OMS-REG-REPL-17); these cover how its stored
// figures are laid out in each calculation step.

// A step as "Name: [label value] op [label value] = result", a term carried
// from an earlier step marked ^.
const read = (steps: CalculationStep[]): string[] =>
  steps.map(
    step =>
      `${step.name}: ${step.terms
        .map(term =>
          isOperator(term)
            ? term
            : `[${term.ref ? '^' : ''}${term.label} ${term.value}]`
        )
        .join(' ')} = ${step.result}`
  );

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
  beforeAll(() => {
    setDictionaries({ en: commonEn });
    setLocale('en');
  });
  afterAll(() => setDictionaries({}));

  it('walks annual target doses, then monthly units from them', () => {
    expect(read(populationSteps(measles, 'Vial'))).toEqual([
      'Annual target doses: [Target population 10,000] × [Number of doses 2] × [Coverage rate 60%] × [Loss factor (50% wastage) 2] = 24,000 doses',
      'Course monthly demand: [^Annual target doses 24,000 doses] ÷ [Months in a year 12] ÷ [Doses per unit 2] = 1,000 Vial',
    ]);
  });

  it('keeps monthly units to the configured places rather than rounding up', () => {
    const [annual, monthly] = populationSteps(
      {
        ...measles,
        annualTargetDoses: 6666.666666666667,
        lossFactor: 1.1111111111111112,
        monthlyUnits: 277.77777777777777,
      },
      null
    );
    // A rounded figure is marked (spec § display rounding).
    expect(annual.result).toBe('6,666.67* doses');
    expect(monthly.result).toBe('277.78* units');
  });

  it('leaves out the loss factor where there is no wastage', () => {
    const [annual] = populationSteps(
      { ...measles, wastageRate: 0, lossFactor: 1 },
      null
    );
    expect(
      annual.terms.some(
        term => !isOperator(term) && term.label.startsWith('Loss factor')
      )
    ).toBe(false);
  });
});

describe('OMS-REG-REPL-11.16 — a course counts its doses per person per year only when it sets one', () => {
  beforeAll(() => {
    setDictionaries({ en: commonEn });
    setLocale('en');
  });
  afterAll(() => setDictionaries({}));

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

  it('counts the doses per person per year in place of the number of doses', () => {
    expect(populationSteps(td, null)[0].terms[2]).toEqual({
      label: 'Average doses per person per year',
      value: '2',
    });
  });

  it('leaves a course counting every dose as it was', () => {
    expect(populationSteps(measles, null)[0].terms[2]).toEqual({
      label: 'Number of doses',
      value: '2',
    });
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
  beforeAll(() => {
    setDictionaries({ en: commonEn });
    setLocale('en');
  });
  afterAll(() => setDictionaries({}));

  const principal: AncillaryRatioPrincipal = {
    itemId: 'vaccine',
    item: { code: 'VAC1', name: 'Vaccine', unitName: 'Vial' },
    principalMonthlyConsumption: 100,
    itemQuantity: 100,
    ancillaryQuantity: 1.1,
    wastageRate: 0,
    ownWastageRate: 0,
    principalUsableConsumption: 100,
    monthlyConsumption: 1.1,
  };

  // Issue #1832: the item's Ancillary tab shows principal : ancillary, so a
  // bare "1.1 : 100" here read the wrong way round. In words, with each
  // side's units, it can't.
  it('shows the ratio in words, each side in its own units', () => {
    expect(ancillaryRatio(principal, 'Syringe', 'Syringe 5ml')).toBe(
      '1.1 Syringe per 100 Vial'
    );
  });

  it('works the contribution out of the principal demand and the ratio', () => {
    expect(read(principalSteps(principal, 'Syringe', 'Syringe 5ml'))).toEqual([
      'Monthly contribution: [Principal monthly demand 100 Vial] × [Ratio 1.1 Syringe per 100 Vial] = 1.1 Syringe',
    ]);
  });

  // Rules › the Ancillary ratio method: a link that excludes the principal's
  // wastage deducts it first, as a step of its own the contribution carries
  // on from; the ancillary's own wastage as a supply is made up as a loss
  // factor. Each shows only when there is some.
  it('deducts the principal wastage and makes up its own, only when there is some', () => {
    expect(
      read(
        principalSteps(
          {
            ...principal,
            wastageRate: 50,
            ownWastageRate: 20,
            principalUsableConsumption: 50,
            monthlyConsumption: 0.6875,
          },
          'Syringe',
          'Syringe 5ml'
        )
      )
    ).toEqual([
      'Demand excluding wastage: [Principal monthly demand 100 Vial] − [Wastage (50%) 50 Vial] = 50 Vial',
      'Monthly contribution: [^Demand excluding wastage 50 Vial] × [Ratio 1.1 Syringe per 100 Vial] × [Loss factor (20% own wastage) 1.25] = 0.69* Syringe',
    ]);
  });

  // Review of #1832: two items sharing a unit word would read "1 Each per
  // 100 Each" — the issue's ambiguity again — so both sides name their item.
  it('names both items where both sides share a unit word', () => {
    expect(
      ancillaryRatio(
        { ...principal, item: { code: 'BCG', name: 'BCG', unitName: 'Each' } },
        'Each',
        'Safety box'
      )
    ).toBe('1.1 Each of Safety box per 100 Each of BCG');
  });

  // PR review of #1832: neither item naming a unit left "1.1 units per 100
  // units of BCG", which didn't say which side was which.
  it('names both items where neither names a unit', () => {
    expect(
      ancillaryRatio(
        { ...principal, item: { code: 'BCG', name: 'BCG', unitName: null } },
        null,
        'Safety box'
      )
    ).toBe('1.1 units of Safety box per 100 units of BCG');
  });

  // The server contributes nothing for a ratio over 0 principal units or an
  // own wastage outside [0, 100) (monthly_consumption); the step shows its
  // result without working that wouldn't multiply out to it.
  it('shows no working where the server contributes nothing', () => {
    for (const broken of [
      { itemQuantity: 0 },
      { ownWastageRate: 100 },
      { ownWastageRate: -5 },
    ])
      expect(
        principalSteps(
          { ...principal, ...broken, monthlyConsumption: 0 },
          'Syringe',
          'Syringe 5ml'
        )
      ).toEqual([
        { name: 'Monthly contribution', terms: [], result: '0 Syringe' },
      ]);
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
        deliveryLeadTimeMonths: 0,
      })
    ).toBe('120 units × 3.5 months (supply interval 3 + safety buffer 0.5)');
  });

  it('adds the delivery lead time where the store has one', () => {
    expect(
      targetStockCaption('120 units', 4.5, {
        supplyIntervalMonths: 3,
        safetyBufferMonths: 0.5,
        deliveryLeadTimeMonths: 1,
      })
    ).toBe(
      '120 units × 4.5 months (supply interval 3 + safety buffer 0.5 + delivery lead time 1)'
    );
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
