import { t } from '../../../intl';

// The stocktake status flow, in order. Shared by the status footer's indicator
// (renders every stage) and FinaliseAction's change button (lists every stage
// too, disabling those at-or-before the current one — you can only move
// forward). A stocktake's flow is just New → Finalised, but it's an ordered
// list so it reads the same as the multi-step flows (shipments) that share
// these components.
export const STATUS_FLOW = ['NEW', 'FINALISED'] as const;
export type StocktakeStatus = (typeof STATUS_FLOW)[number];

export const STATUS_LABELS: Record<StocktakeStatus, string> = {
  get NEW() {
    return t('stocktake.status.new');
  },
  get FINALISED() {
    return t('stocktake.status.finalised');
  },
};

// The current stage's index in the flow (−1 if the status isn't a known flow
// member).
export const statusIndex = (status: string): number =>
  STATUS_FLOW.indexOf(status as StocktakeStatus);
