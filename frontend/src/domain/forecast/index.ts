// The shared population-forecast module (kdd/domain-modules): the stored
// per-course breakdown's type + parser, the calculation-display arithmetic,
// and the collapsible per-course display both requisition verticals show on a
// forecast-carrying line. Specced at internal-orders (S4, AC-PF7); consumed
// by requisitions on transferred forecast lines (AC-LE13).
export {
  parseVaccineCourses,
  forecastSteps,
  type VaccineCourse,
  type ForecastStep,
} from './forecast';
export { ForecastCalculationDisplay } from './ForecastCalculationDisplay';
