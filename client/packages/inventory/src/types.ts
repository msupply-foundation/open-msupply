import { StocktakeLineFragment } from './Stocktake/api/operations.generated';

export interface StocktakeSummaryItem {
  id: string;
  item?: StocktakeLineFragment['item'] | null;
  lines: StocktakeLineFragment[];
}
