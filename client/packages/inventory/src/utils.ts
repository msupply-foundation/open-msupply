import {
  LocaleKey,
  StocktakeNodeStatus,
  useTranslation,
} from '@openmsupply-client/common';
import { StocktakeRowFragment } from './Stocktake/api';

export const stocktakeStatuses = [
  StocktakeNodeStatus.New,
  StocktakeNodeStatus.Finalised,
];

const stocktakeStatusToLocaleKey: Record<StocktakeNodeStatus, LocaleKey> = {
  [StocktakeNodeStatus.New]: 'label.new',
  [StocktakeNodeStatus.Finalised]: 'label.finalised',
};

export const getStatusTranslation = (status: StocktakeNodeStatus) => {
  return stocktakeStatusToLocaleKey[status];
};

export const getNextStocktakeStatus = (
  currentStatus: StocktakeNodeStatus
): StocktakeNodeStatus | null => {
  const idx = stocktakeStatuses.findIndex(status => currentStatus === status);
  const nextStatus = stocktakeStatuses[idx + 1];
  return nextStatus ?? null;
};

export const getStocktakeTranslator =
  (t: ReturnType<typeof useTranslation>) =>
  (currentStatus: StocktakeNodeStatus | null): string => {
    if (currentStatus === StocktakeNodeStatus.New) {
      return t('label.new', { ns: 'inventory' });
    }

    return t('label.finalised', { ns: 'inventory' });
  };

export const canDeleteStocktake = (row: StocktakeRowFragment): boolean =>
  row.status === StocktakeNodeStatus.New;

export const isStocktakeDisabled = (row: StocktakeRowFragment): boolean =>
  row.status !== StocktakeNodeStatus.New || row.isLocked;
