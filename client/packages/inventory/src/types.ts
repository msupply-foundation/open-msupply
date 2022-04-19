import { ItemRowFragment } from '@openmsupply-client/system';
import { StocktakeLineFragment } from './Stocktake/api/operations.generated';

export interface StocktakeSummaryItem {
  id: string;
  item?: ItemRowFragment | null;
  lines: StocktakeLineFragment[];
}
