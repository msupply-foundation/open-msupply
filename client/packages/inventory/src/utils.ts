import {
  StocktakeNodeStatus,
  useTranslation,
  Item,
} from '@openmsupply-client/common';
import { StocktakeRowFragment } from './Stocktake/api';

export const getStocktakeStatuses = (): StocktakeNodeStatus[] => [
  StocktakeNodeStatus.New,
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
    if (currentStatus === StocktakeNodeStatus.New) {
      return t('label.suggested', { ns: 'inventory' });
    }

    return t('label.finalised', { ns: 'inventory' });
  };

export const canDeleteStocktake = (row: StocktakeRowFragment): boolean =>
  row.status === StocktakeNodeStatus.New;

export const toItem = (line: ItemLike): Item => ({
  __typename: 'ItemNode',
  stats: {
    __typename: 'ItemStatsNode',
    averageMonthlyConsumption: 0,
    monthsOfStock: 0,
    stockOnHand: 0,
  },
  id: 'lines' in line ? line.lines[0].itemId : line.itemId,
  name: 'lines' in line ? line.lines[0].itemName : line.itemName,
  code: 'lines' in line ? line.lines[0].itemCode : line.itemCode,
  isVisible: true,
  availableBatches: [],
  availableQuantity: 0,
  unitName: '',
});

type ItemLike = ItemLikeLine | ItemLikeAggregate;

interface ItemLikeLine {
  itemId: string;
  itemName: string;
  itemCode: string;
}

interface ItemLikeAggregate {
  itemId: string;
  lines: [ItemLikeLine, ...ItemLikeLine[]];
}
