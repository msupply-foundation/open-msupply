import { ObjectWithStringKeys } from '@openmsupply-client/common';

export interface StockRow extends ObjectWithStringKeys {
  id: string;
  itemCode: string;
  itemId: string;
  itemName: string;
  itemUnit: string;
  batch: string;
  expiryDate: Date | null;
  packSize: number;
  numberOfPacks: number;
  locationName: string;
}
