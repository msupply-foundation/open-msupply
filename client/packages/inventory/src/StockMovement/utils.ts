import {
  LocaleKey,
  StockRelocationNodeStatus,
  TypedTFunction,
} from '@openmsupply-client/common';

export const getStatusTranslationKey = (
  status: StockRelocationNodeStatus
): LocaleKey => {
  switch (status) {
    case StockRelocationNodeStatus.New:
      return 'label.new';
    case StockRelocationNodeStatus.Finalised:
    default:
      return 'label.finalised';
  }
};

export const getStatusTranslation = (
  status: StockRelocationNodeStatus,
  t: TypedTFunction<LocaleKey>
): string => t(getStatusTranslationKey(status));
