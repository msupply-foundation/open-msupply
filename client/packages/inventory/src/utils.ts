import { StocktakeNodeStatus } from '@openmsupply-client/common';
import { StocktakeItem, StocktakeLine, StocktakeController } from './types';

export const placeholderStocktake: StocktakeController = {
  id: '',
  comment: '',
  description: '',
  lines: [],
  status: StocktakeNodeStatus.Draft,
  stocktakeDate: '',
  stocktakeNumber: 0,
  update: () => {
    throw new Error("Placeholder updater triggered - this shouldn't happen!");
  },
};

export const isStocktakeEditable = (
  stocktake: StocktakeController
): boolean => {
  return stocktake.status !== 'FINALISED';
};

export const flattenStocktakeItems = (
  summaryItems: StocktakeItem[]
): StocktakeLine[] => {
  return summaryItems.map(({ lines }) => Object.values(lines)).flat();
};

export const getStocktakeStatuses = (): StocktakeNodeStatus[] => [
  StocktakeNodeStatus.Draft,
  StocktakeNodeStatus.Confirmed,
  StocktakeNodeStatus.Finalised,
];

export const getNextStocktakeStatus = (
  currentStatus: StocktakeNodeStatus
): StocktakeNodeStatus => {
  const statuses = getStocktakeStatuses();
  const currentStatusIdx = statuses.findIndex(
    status => currentStatus === status
  );

  const nextStatus = statuses[currentStatusIdx + 1];

  if (!nextStatus) throw new Error('Could not find the next status');

  return nextStatus;
};

// TODO: When supplier requisition statuses are finalised, this function should be passed
// `t` and should properly translate the status.
export const getStocktakeTranslator =
  () =>
  (currentStatus: StocktakeNodeStatus): string =>
    currentStatus;
