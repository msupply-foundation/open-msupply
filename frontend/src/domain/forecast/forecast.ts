import { t } from '../../intl';
import { formatNumber, round } from '../../intl/formatNumber';
import { roundedText } from '../../intl/numberDisplay';

// The shared population-forecast module (kdd/domain-modules): the per-course
// breakdown a forecast-carrying requisition line stores
// (RequisitionLineNode.vaccineCourses) and the calculation-display arithmetic
// over it. The surface is specced at internal-orders (S4, AC-PF7); the
// requisitions vertical shows the same display on a transferred forecast line
// (spec/requisitions § forecast context, AC-LE13). The client parses and
// renders this; it never writes or recomputes it.

// One course-and-demographic group of a line's stored population forecast —
// the shape the server serialises (contract › Population-based forecasting).
export type VaccineCourse = {
  /**
   * Pre-formatted "<course> (<demographic>)"; empty parens for a
   * demographic-less course.
   */
  courseTitle: string;
  numberOfDoses: number;
  coverageRate: number;
  targetPopulation: number;
  wastageRate: number;
  lossFactor: number;
  annualTargetDoses: number;
  bufferStockMonths: number;
  supplyPeriodMonths: number;
  dosesPerUnit: number;
  forecastDoses: number;
  forecastUnits: number;
};

// Parse a line's stored vaccineCourses JSON into its per-course breakdown. A
// null, empty, or unparseable string yields no courses (the display then falls
// back to the ordinary charts).
export const parseVaccineCourses = (json: string | null): VaccineCourse[] => {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as VaccineCourse[]) : [];
  } catch {
    return [];
  }
};

// One arithmetic step of the calculation display: its figures substituted into
// the formula, then the emphasised result (AC-PF7). The step's title and
// formula wording are static locale keys held by the display component; this
// pure function owns only the arithmetic so it can be tested against the AC's
// exact figures. The loss factor keeps the reference's 3 dp — a rate, not a
// count of things; the dose totals follow the configured decimal places, and
// the units result is the ceil of the stored total.
export type ForecastStep = { substitution: string; result: string };

export const forecastSteps = (
  course: VaccineCourse
): [ForecastStep, ForecastStep, ForecastStep] => [
  {
    // 1. Annual target doses = target population × doses × (coverage/100) ×
    // loss factor.
    substitution: `${formatNumber(course.targetPopulation)} × ${formatNumber(course.numberOfDoses)} × (${formatNumber(course.coverageRate)} / 100) × ${round(course.lossFactor, 3)}`,
    result: `= ${roundedText(course.annualTargetDoses)} ${t('label.doses-per-year')}`,
  },
  {
    // 2. Forecast doses = annual/12 × (supply period + buffer stock months).
    substitution: `(${roundedText(course.annualTargetDoses)} / 12) × (${formatNumber(course.supplyPeriodMonths)} + ${formatNumber(course.bufferStockMonths)})`,
    result: `= ${roundedText(course.forecastDoses)} ${t('label.doses').toLowerCase()}`,
  },
  {
    // 3. Forecast units = forecast doses ÷ doses per unit (result rounded up).
    substitution: `${roundedText(course.forecastDoses)} / ${formatNumber(course.dosesPerUnit)}`,
    result: `= ${formatNumber(Math.ceil(course.forecastUnits))} ${t('label.units').toLowerCase()}`,
  },
];
