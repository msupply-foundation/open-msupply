import { ObjectWithStringKeys } from '@openmsupply-client/common';

export interface StockRow extends ObjectWithStringKeys {
  id: string;
  itemCode: string;
  itemName: string;
  itemUnit: string;
  batch: string;
  expiryDate: Date;
  packSize: number;
  numberOfPacks: number;
}
