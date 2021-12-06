import { useTranslation } from './../../common/src/intl/intlHelpers';
import { StocktakeNodeStatus } from '@openmsupply-client/common';
import { StocktakeItem, StocktakeLine, StocktakeController } from './types';

export const placeholderStocktake: StocktakeController = {
  id: '',
  comment: '',
  description: '',
  lines: [],
  status: StocktakeNodeStatus.Suggested,
  stocktakeDatetime: null,
  stocktakeNumber: 0,
  enteredByName: '',
  entryDatetime: new Date(),
  onHold: false,
  update: () => {
    throw new Error("Placeholder updater triggered - this shouldn't happen!");
  },
  updateStocktakeDatetime: () => {
    throw new Error("Placeholder updater triggered - this shouldn't happen!");
  },
  updateOnHold: () => {
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
  StocktakeNodeStatus.Suggested,
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

// TODO: When stocktake statuses are finalised, this function should be passed
// `t` and should properly translate the status.
export const getStocktakeTranslator =
  (t: ReturnType<typeof useTranslation>) =>
  (currentStatus: StocktakeNodeStatus): string => {
    if (currentStatus === StocktakeNodeStatus.Suggested) {
      return t('label.suggested', { ns: 'inventory' });
    }

    return t('label.finalised', { ns: 'inventory' });
  };
