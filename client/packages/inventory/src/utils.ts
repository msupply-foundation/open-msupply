import {
  Formatter,
  LocaleKey,
  StocktakeNodeStatus,
  TypedTFunction,
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

export const stocktakesToCsv = (
  invoices: StocktakeRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.number'),
    t('label.status'),
    t('heading.description'),
    t('label.comment'),
    t('label.created'),
    t('label.date'),
  ];

  const data = invoices.map(node => [
    node.id,
    node.stocktakeNumber,
    node.status,
    node.description,
    node.comment,
    Formatter.csvDateTimeString(node.createdDatetime),
    Formatter.csvDateString(node.stocktakeDate),
  ]);
  return Formatter.csv({ fields, data });
};
