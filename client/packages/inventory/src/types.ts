import {
  Column,
  StocktakeLineNode,
  StocktakeNode,
  StocktakeNodeStatus,
} from '@openmsupply-client/common';

export type StocktakeRow = Pick<
  StocktakeNode,
  | 'id'
  | 'comment'
  | 'description'
  | 'stocktakeDatetime'
  | 'stocktakeNumber'
  | 'status'
>;

export interface StocktakeLine extends StocktakeLineNode {
  isCreated?: boolean;
  isDeleted?: boolean;
  isUpdated?: boolean;
  countThisLine: boolean;
  update?: (patch: Partial<StocktakeLine> & { id: string }) => void;
}

export interface StocktakeSummaryItem {
  id: string;
  itemId: string;
  lines: [StocktakeLine, ...StocktakeLine[]];
}
export interface StocktakeItem {
  id: string;
  itemCode: () => string;
  itemName: () => string;
  isDeleted?: boolean;
  lines: StocktakeLine[];

  batch: () => string;
  expiryDate: () => string;
  countedNumPacks: () => string;
  snapshotNumPacks: () => string;
  upsertLine: (line: StocktakeLine) => void;
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

export interface StocktakeController extends Omit<Stocktake, 'lines'> {
  lines: StocktakeItem[];
  update: (key: string, value: string) => void;
  updateStocktakeDatetime: (newDate: Date | null) => void;
  updateOnHold: () => void;
  updateStatus: (newStatus: StocktakeNodeStatus) => void;
  sortBy: (column: Column<StocktakeItem>) => void;
  upsertItem: (item: StocktakeItem) => void;
}

export enum StocktakeActionType {
  Update = 'Stocktake/Update',
  UpdateStocktakeDatetime = 'Stocktake/UpdateStocktakeDatetime',
  UpdateOnHold = 'Stocktake/UpdateOnHold',
  UpdateStatus = 'Stocktake/UpdateStatus',
  SortBy = 'Stocktake/SortBy',
  Upsert = 'Stocktake/Upsert',
}

export type StocktakeAction =
  | {
      type: StocktakeActionType.Update;
      payload: { key: string; value: string };
    }
  | {
      type: StocktakeActionType.UpdateStocktakeDatetime;
      payload: { newDate: Date | null };
    }
  | {
      type: StocktakeActionType.UpdateOnHold;
    }
  | {
      type: StocktakeActionType.UpdateStatus;
      payload: { newStatus: StocktakeNodeStatus };
    }
  | {
      type: StocktakeActionType.SortBy;
      payload: { column: Column<StocktakeItem> };
    }
  | {
      type: StocktakeActionType.Upsert;
      payload: { item: StocktakeItem };
    };
