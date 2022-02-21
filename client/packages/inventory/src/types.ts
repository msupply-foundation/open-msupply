import { StocktakeLineFragment } from './Stocktake/api/operations.generated';

export interface StocktakeSummaryItem {
  id: string;
  itemId: string;
  lines: [StocktakeLineFragment, ...StocktakeLineFragment[]];
}
