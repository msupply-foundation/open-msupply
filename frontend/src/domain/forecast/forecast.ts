import { measureWord, t, tPlural } from '../../intl';
import { formatNumber, round } from '../../intl/formatNumber';
import { roundedText } from '../../intl/numberDisplay';
import type {
  ForecastLineFragment,
  ForecastMethodOptionFragment,
  SupplyIntervalAndBufferFragment,
} from './forecast.generated';

// The shared forecast module (kdd/domain-modules): a requisition line's stored
// forecast — its method, monthly demand, and breakdown — and the arithmetic the
// forecast block displays over it. Specced at internal-orders (S4, rules ›
// forecasting); the requisitions vertical shows the read-only form on a
// transferred line (spec/requisitions › forecast context). The client renders
// the forecast and asks the server to change a line's method; it never computes
// one.

export type ForecastMethod = ForecastLineFragment['forecastMethod'];
export type ForecastBreakdown = ForecastLineFragment['forecastBreakdown'];
export type PopulationCourse = Extract<
  ForecastBreakdown,
  { __typename: 'PopulationForecastNode' }
>['courses'][number];
export type AncillaryRatioPrincipal = Extract<
  ForecastBreakdown,
  { __typename: 'AncillaryRatioForecastNode' }
>['principals'][number];

/** One entry of a line's forecastMethodOptions. */
export type ForecastMethodOption = ForecastMethodOptionFragment;

/**
 * Why a method can't be chosen — the schema's
 * ForecastMethodUnavailableReasonNode.
 */
export type ForecastMethodUnavailableReason = NonNullable<
  ForecastMethodOption['unavailableReason']
>;

/** The methods in the order the select offers them. */
export const FORECAST_METHODS: readonly ForecastMethod[] = [
  'AMC',
  'POPULATION',
  'ANCILLARY_RATIO',
];

export const forecastMethodLabel = (method: ForecastMethod): string => {
  switch (method) {
    case 'AMC':
      return t('label.forecast-method-amc');
    case 'POPULATION':
      return t('label.forecast-method-population');
    case 'ANCILLARY_RATIO':
      return t('label.forecast-method-ancillary-ratio');
  }
};

export const unavailableReasonMessage = (
  reason: ForecastMethodUnavailableReason
): string => {
  switch (reason) {
    case 'POPULATION_PREFERENCE_OFF':
      return t('messages.forecast-method-unavailable-population-preference');
    case 'NO_POPULATION_SERVED':
      return t('messages.forecast-method-unavailable-no-population-served');
    case 'NO_VACCINE_COURSE':
      return t('messages.forecast-method-unavailable-no-vaccine-course');
    case 'NO_PRINCIPAL_ON_ORDER':
      return t('messages.forecast-method-unavailable-no-principal');
  }
};

/**
 * A course group's title: the course name, and its demographic in parentheses.
 */
export const courseTitle = (course: PopulationCourse): string =>
  course.demographicName
    ? `${course.courseName} (${course.demographicName})`
    : course.courseName;

// A breakdown as named calculation steps. Each step works one quantity out of
// its terms — every term a value under the name of what it is ("Coverage rate"
// over "81%"), the operators between them — to its result. A later step uses
// an earlier one's result as a term under that step's name (`ref`), so a
// breakdown reads as a chain of named quantities however they combine, not as
// one long column. The names are words, so a step reads the same in every
// locale; the values carry their measure where they are quantities.
export type Operator = '×' | '÷' | '+' | '−';
export type Term = { label: string; value: string; ref?: boolean };
export type CalculationStep = {
  name: string;
  terms: (Term | Operator)[];
  result: string;
};

export const isOperator = (term: Term | Operator): term is Operator =>
  typeof term === 'string';

// A wastage rate's loss factor — 1 ÷ (1 − wastage) — to the 3 dp a rate keeps.
const lossFactor = (factor: number): string => round(factor, 3);

const doses = (count: number): string =>
  `${roundedText(count)} ${measureWord('doses', null, count)}`;

const units = (count: number, unitName: string | null): string =>
  `${roundedText(count)} ${measureWord('units', unitName, count)}`;

/**
 * A Population course group's steps: annual target doses = target population
 * × doses × coverage × loss factor; monthly demand = annual target doses ÷ 12
 * ÷ doses per unit, in the item's units. The loss factor is left out where
 * there is no wastage to make up (a factor of 1). Rounding: the loss factor
 * keeps 3 dp — a rate, not a count of things; the annual doses and the
 * monthly units follow the configured decimal places — monthly demand keeps
 * its fraction.
 */
export const populationSteps = (
  course: PopulationCourse,
  unitName: string | null
): [CalculationStep, CalculationStep] => {
  const annualTargetDoses = doses(course.annualTargetDoses);
  return [
    {
      name: t('label.annual-target-doses'),
      terms: [
        {
          label: t('label.target-population'),
          value: formatNumber(course.targetPopulation),
        },
        '×',
        // A course with an average doses per person per year counts that in
        // place of its number of doses, so a course counting every dose
        // (births) reads as it always has.
        course.annualDosesPerPerson != null
          ? {
              label: t('label.annual-doses-per-person'),
              value: formatNumber(course.annualDosesPerPerson),
            }
          : {
              label: t('label.number-of-doses'),
              value: formatNumber(course.numberOfDoses),
            },
        '×',
        {
          label: t('label.coverage-rate'),
          value: `${formatNumber(course.coverageRate)}%`,
        },
        ...(course.lossFactor !== 1
          ? [
              '×' as const,
              {
                label: t('label.loss-factor-wastage', {
                  rate: formatNumber(course.wastageRate),
                }),
                value: lossFactor(course.lossFactor),
              },
            ]
          : []),
      ],
      result: annualTargetDoses,
    },
    {
      name: t('label.course-monthly-demand'),
      terms: [
        {
          label: t('label.annual-target-doses'),
          value: annualTargetDoses,
          ref: true,
        },
        '÷',
        { label: t('label.months-in-a-year'), value: formatNumber(12) },
        '÷',
        {
          label: t('label.doses-per-unit'),
          value: formatNumber(course.dosesPerUnit),
        },
      ],
      result: units(course.monthlyUnits, unitName),
    },
  ];
};

/**
 * A principal's configured ratio in words, each side in its own item's units —
 * "1.1 Syringe per 100 Vial" — so it reads the one way round whichever screen
 * shows it. Where both sides would carry the same word ("1 Each per 100
 * Each"), the principal side names its item, so the numbers can't swap.
 */
export const ancillaryRatio = (
  principal: AncillaryRatioPrincipal,
  unitName: string | null
): string => {
  const ancillaryWord = measureWord(
    'units',
    unitName,
    principal.ancillaryQuantity
  );
  const principalWord = measureWord(
    'units',
    principal.item?.unitName ?? null,
    principal.itemQuantity
  );
  const values = {
    ancillary: `${formatNumber(principal.ancillaryQuantity)} ${ancillaryWord}`,
    principal: `${formatNumber(principal.itemQuantity)} ${principalWord}`,
  };
  return ancillaryWord === principalWord
    ? t('label.ancillary-per-principal-item', {
        ...values,
        item: principal.item?.name ?? principal.itemId,
      })
    : t('label.ancillary-per-principal', values);
};

/**
 * A principal's steps (spec/internal-orders › the Ancillary ratio method):
 * where the link excludes the principal's wastage, demand excluding wastage =
 * the principal's monthly demand − its wasted units; then the monthly
 * contribution = that demand × the ratio × the loss factor of the ancillary's
 * own wastage, in the ancillary's units. The principal's quantities stay in
 * its own units — the entry mode's packs and doses are the ancillary's. The
 * wastage shows only where there is some. A ratio over 0 principal units, or
 * an own wastage outside [0, 100), contributes nothing on the server
 * (monthly_consumption); the contribution then shows without working that
 * wouldn't multiply out.
 */
export const principalSteps = (
  principal: AncillaryRatioPrincipal,
  unitName: string | null
): CalculationStep[] => {
  const principalUnitName = principal.item?.unitName ?? null;
  const monthlyDemand: Term = {
    label: t('label.principal-monthly-demand'),
    value: units(principal.principalMonthlyConsumption, principalUnitName),
  };
  const steps: CalculationStep[] = [];
  let demand = monthlyDemand;
  if (principal.wastageRate > 0) {
    const lessWastage = units(
      principal.principalUsableConsumption,
      principalUnitName
    );
    steps.push({
      name: t('label.demand-excluding-wastage'),
      terms: [
        monthlyDemand,
        '−',
        {
          label: t('label.wastage-percent', {
            rate: formatNumber(principal.wastageRate),
          }),
          value: units(
            principal.principalMonthlyConsumption -
              principal.principalUsableConsumption,
            principalUnitName
          ),
        },
      ],
      result: lessWastage,
    });
    demand = {
      label: t('label.demand-excluding-wastage'),
      value: lessWastage,
      ref: true,
    };
  }
  const contributes =
    principal.itemQuantity !== 0 &&
    principal.ownWastageRate >= 0 &&
    principal.ownWastageRate < 100;
  steps.push({
    name: t('label.monthly-contribution'),
    terms: !contributes
      ? []
      : [
          demand,
          '×',
          {
            label: t('label.ratio'),
            value: ancillaryRatio(principal, unitName),
          },
          ...(principal.ownWastageRate > 0
            ? [
                '×' as const,
                {
                  label: t('label.loss-factor-own-wastage', {
                    rate: formatNumber(principal.ownWastageRate),
                  }),
                  value: lossFactor(1 / (1 - principal.ownWastageRate / 100)),
                },
              ]
            : []),
        ],
    result: units(principal.monthlyConsumption, unitName),
  });
  return steps;
};

/**
 * A principal's item as "CODE Name", falling back to its id when unresolved.
 */
export const principalItemLabel = (
  principal: AncillaryRatioPrincipal
): string =>
  principal.item
    ? `${principal.item.code} ${principal.item.name}`
    : principal.itemId;

/**
 * The target-stock step's caption: monthly demand × target months. Where the
 * target came from the store's supply interval + safety buffer, the months
 * show the supply interval and safety buffer that make them up (spec S4 › the
 * forecast, OMS-REG-REPL-17.17) — "120 units × 3.5 months (supply interval 3
 * + safety buffer 0.5)".
 */
export const targetStockCaption = (
  monthlyDemand: string,
  targetMonths: number,
  intervalAndBuffer?: SupplyIntervalAndBufferFragment
): string => {
  // Plural-aware, so a one-month target reads "1 month".
  const months = tPlural('label.number-months', targetMonths, {
    count: formatNumber(targetMonths),
  });
  const step = `${monthlyDemand} × ${months}`;
  if (!intervalAndBuffer) return step;
  const makeup = t('label.supply-interval-plus-buffer', {
    supplyInterval: formatNumber(intervalAndBuffer.supplyIntervalMonths),
    safetyBuffer: formatNumber(intervalAndBuffer.safetyBufferMonths),
  });
  return `${step} (${makeup})`;
};
