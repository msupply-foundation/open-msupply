import {
  LocationRowFragment,
  MasterListRowFragment,
  VvmStatusFragment,
} from '@openmsupply-client/system';

export enum StocktakeType {
  BLANK = 'BLANK',
  FULL = 'FULL',
  FILTERED = 'FILTERED',
}

export interface CreateStocktakeModalState {
  masterList: MasterListRowFragment | null;
  vvmStatus: VvmStatusFragment | null;
  location: LocationRowFragment | null;
  expiryDate: Date | null;
  type: StocktakeType;
  includeAllItems: boolean;
}
