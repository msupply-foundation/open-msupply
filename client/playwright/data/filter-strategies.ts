import { ReportArgumentsModal } from '../pages/report-arguments-modal.page';

export type FilterStrategy = (
  modal: ReportArgumentsModal
) => Promise<void>;

/**
 * Default strategy: accept default filter values without modification.
 * Works for all reports where no fields are required.
 */
export const defaultFilterStrategy: FilterStrategy = async () => {
};

/**
 * Per-report filter strategies that override the default.
 * Key is the report code.
 */
export const reportFilterStrategies: Record<string, FilterStrategy> = {
  // Currently empty. Add overrides here as needed.
  // Example: override for a specific report
  // 'outbound-shipments': async (modal) => {
  //   await modal.fillDateRange('2024-01-01', '2024-12-31');
  // },
};

/**
 * Returns the filter strategy for a given report code,
 * falling back to the default if no override exists.
 */
export function getFilterStrategy(code: string): FilterStrategy {
  return reportFilterStrategies[code] ?? defaultFilterStrategy;
}
