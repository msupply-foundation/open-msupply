import { StocktakeLineNode } from './../../common/src/types/schema';
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

export interface StocktakeLine extends StocktakeLineNode {
  isCreated?: boolean;
  isDeleted?: boolean;
  isUpdated?: boolean;
}

export interface StocktakeItem {
  id: string;
  itemCode: string;
  itemName: string;
  isDeleted?: boolean;
  lines: StocktakeLine[];
}

export interface Stocktake
  extends Omit<StocktakeNode, 'lines' | '__typename' | 'stocktakeDate'> {
  lines: StocktakeLine[];
  stocktakeDate: Date;
}

export interface StocktakeController extends Omit<Stocktake, 'lines'> {
  lines: StocktakeItem[];
  update: (key: string, value: string) => void;
  updateStocktakeDate: (newDate: Date | null) => void;
}

export enum StocktakeActionType {
  Update = 'Stocktake/Update',
  UpdateStocktakeDate = 'Stocktake/UpdateStocktakeDate',
}

export type StocktakeAction =
  | {
      type: StocktakeActionType.Update;
      payload: { key: string; value: string };
    }
  | {
      type: StocktakeActionType.UpdateStocktakeDate;
      payload: { newDate: Date | null };
    };
