import {
  LocaleKey,
  StockRelocationNodeStatus,
  TypedTFunction,
} from '@openmsupply-client/common';

export const stockMovementStatuses = [
  StockRelocationNodeStatus.New,
  StockRelocationNodeStatus.Confirmed,
  StockRelocationNodeStatus.Finalised,
];

const getStatusTranslationKey = (
  status: StockRelocationNodeStatus
): LocaleKey => {
  switch (status) {
    case StockRelocationNodeStatus.New:
      return 'label.new';
    case StockRelocationNodeStatus.Confirmed:
      return 'label.confirmed';
    case StockRelocationNodeStatus.Finalised:
    default:
      return 'label.finalised';
  }
};

export const getStatusTranslation = (
  status: StockRelocationNodeStatus,
  t: TypedTFunction<LocaleKey>
): string => t(getStatusTranslationKey(status));

export const getNextStockMovementStatus = (
  currentStatus: StockRelocationNodeStatus
): StockRelocationNodeStatus | null => {
  const idx = stockMovementStatuses.findIndex(
    status => currentStatus === status
  );
  return stockMovementStatuses[idx + 1] ?? null;
};

export const isStockMovementDisabled = (
  status: StockRelocationNodeStatus
): boolean => status === StockRelocationNodeStatus.Finalised;

export const canDeleteStockMovement = (
  status: StockRelocationNodeStatus
): boolean => status !== StockRelocationNodeStatus.Finalised;
