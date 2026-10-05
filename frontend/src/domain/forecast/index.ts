// The shared forecast module (kdd/domain-modules): a requisition line's stored
// forecast — method, monthly demand, breakdown — its display arithmetic, and
// the forecast block both requisition verticals' editors show. Specced at
// internal-orders (S4, rules › forecasting); consumed read-only by requisitions
// on transferred lines (rules › forecast context).
export {
  FORECAST_METHODS,
  forecastMethodLabel,
  unavailableReasonMessage,
  courseTitle,
  populationSteps,
  ancillaryRatio,
  principalItemLabel,
  targetStockCaption,
  type ForecastMethod,
  type ForecastMethodOption,
  type ForecastMethodUnavailableReason,
  type ForecastBreakdown,
  type ForecastStep,
  type PopulationCourse,
  type AncillaryRatioPrincipal,
} from './forecast';
export type {
  ForecastLineFragment,
  SupplyHorizonFragment,
} from './forecast.generated';
export { ForecastBlock, type ForecastBlockProps } from './ForecastBlock';
