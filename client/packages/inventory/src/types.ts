import { StocktakeNode } from '@openmsupply-client/common';

export type StocktakeRow = Pick<
  StocktakeNode,
  | 'id'
  | 'comment'
  | 'description'
  | 'stocktakeDate'
  | 'stocktakeNumber'
  | 'status'
>;
