import { StocktakeLineNode, StocktakeNode } from '@openmsupply-client/common';

export type StocktakeRow = Pick<
  StocktakeNode,
  | 'id'
  | 'comment'
  | 'description'
  | 'stocktakeDatetime'
  | 'stocktakeNumber'
  | 'status'
>;

export interface StocktakeLine extends Omit<StocktakeLineNode, 'expiryDate'> {
  countThisLine: boolean;
  expiryDate: Date | null;
}

export interface StocktakeSummaryItem {
  id: string;
  itemId: string;
  lines: [StocktakeLine, ...StocktakeLine[]];
}

export interface Stocktake
  extends Omit<
    StocktakeNode,
    'lines' | '__typename' | 'stocktakeDatetime' | 'entryDatetime'
  > {
  lines: StocktakeLine[];
  stocktakeDatetime: Date | null;
  entryDatetime: Date;
}
