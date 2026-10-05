import { t } from '../../intl';
import { formatNumber, round } from '../../intl/formatNumber';
import type { ForecastLineFragment } from './forecast.generated';

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

/**
 * Why a method can't be chosen — the schema's
 * ForecastMethodUnavailableReasonNode.
 */
export type ForecastMethodUnavailableReason =
  | 'POPULATION_PREFERENCE_OFF'
  | 'NO_POPULATION_SERVED'
  | 'NO_VACCINE_COURSE'
  | 'NO_PRINCIPAL_ON_ORDER';

/** One entry of a line's forecastMethodOptions. */
export type ForecastMethodOption = {
  method: ForecastMethod;
  isAvailable: boolean;
  unavailableReason: ForecastMethodUnavailableReason | null;
};

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
// arithmetic. Rounding: the loss factor to 3 dp, the annual doses and the
// monthly units to 2 dp — monthly demand keeps its fraction.
export type ForecastStep = { substitution: string; result: string };

export const populationSteps = (
  course: PopulationCourse
): [ForecastStep, ForecastStep] => [
  {
    // 1. Annual target doses = target population × doses × (coverage/100) ×
    // loss factor.
    substitution: `${formatNumber(course.targetPopulation)} × ${formatNumber(course.numberOfDoses)} × (${formatNumber(course.coverageRate)} / 100) × ${round(course.lossFactor, 3)}`,
    result: `= ${round(course.annualTargetDoses, 2)} ${t('label.doses-per-year')}`,
  },
  {
    // 2. Monthly units = annual target doses / 12 / doses per unit.
    substitution: `${round(course.annualTargetDoses, 2)} / 12 / ${formatNumber(course.dosesPerUnit)}`,
    result: `= ${round(course.monthlyUnits, 2)} ${t('label.units-per-month')}`,
  },
];

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
