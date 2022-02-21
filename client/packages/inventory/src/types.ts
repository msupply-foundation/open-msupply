import { StocktakeLineFragment } from './Stocktake/api/operations.generated';

export interface StocktakeSummaryItem {
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  lines: [StocktakeLineFragment, ...StocktakeLineFragment[]];
}
