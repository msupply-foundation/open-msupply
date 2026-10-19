import { t, tPlural, type LocaleKey } from '../../intl';
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

// One arithmetic step of a Population course: its figures substituted into the
// formula, then the emphasised result. The step's title and formula wording are
// static locale keys held by the component; this pure function owns only the
// arithmetic. Rounding: the loss factor keeps 3 dp — a rate, not a count of
// things; the annual doses and the monthly units follow the configured decimal
// places — monthly demand keeps its fraction.
export type ForecastStep = { substitution: string; result: string };

// Whether step 1 carries the start-rate factor: only for a course that starts
// less than its whole group each year, so a yearly cohort (births) reads as it
// always has.
const startsPartOfGroup = (course: PopulationCourse): boolean =>
  course.annualStartRate !== 100;

/** Step 1's formula wording, matching its substitution's factors. */
export const annualTargetFormulaKey = (course: PopulationCourse): LocaleKey =>
  startsPartOfGroup(course)
    ? 'description.annual-target-doses-calculation-with-start-rate'
    : 'description.annual-target-doses-calculation';

export const populationSteps = (
  course: PopulationCourse
): [ForecastStep, ForecastStep] => [
  {
    // 1. Annual target doses = target population [× (start rate/100)] ×
    // doses × (coverage/100) × loss factor.
    substitution: `${formatNumber(course.targetPopulation)} × ${startsPartOfGroup(course) ? `(${formatNumber(course.annualStartRate)} / 100) × ` : ''}${formatNumber(course.numberOfDoses)} × (${formatNumber(course.coverageRate)} / 100) × ${round(course.lossFactor, 3)}`,
    result: `= ${roundedText(course.annualTargetDoses)} ${t('label.doses-per-year')}`,
  },
  {
    // 2. Monthly units = annual target doses / 12 / doses per unit.
    substitution: `${roundedText(course.annualTargetDoses)} / 12 / ${formatNumber(course.dosesPerUnit)}`,
    result: `= ${roundedText(course.monthlyUnits)} ${t('label.units-per-month')}`,
  },
];

/**
 * The deduction a principal's wastage makes before the ratio applies — "− 50%
 * wastage" — or undefined when the link orders for the wasted units too
 * (spec/internal-orders › the Ancillary ratio method).
 */
export const principalWastageDeduction = (
  principal: AncillaryRatioPrincipal
): string | undefined =>
  principal.wastageRate > 0
    ? t('description.less-principal-wastage', {
        rate: formatNumber(principal.wastageRate),
      })
    : undefined;

/** A principal's configured ratio, as ancillary : principal. */
export const ancillaryRatio = (principal: AncillaryRatioPrincipal): string =>
  `${formatNumber(principal.ancillaryQuantity)} : ${formatNumber(principal.itemQuantity)}`;

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
