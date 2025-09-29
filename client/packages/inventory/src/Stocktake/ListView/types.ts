import {
  LocationRowFragment,
  MasterListRowFragment,
  VvmStatusFragment,
} from '@openmsupply-client/system';

export interface CreateStocktakeModalState {
  masterList: MasterListRowFragment | null;
  vvmStatus: VvmStatusFragment | null;
  location: LocationRowFragment | null;
  expiryDate: Date | null;
  createBlankStocktake: boolean;
  includeAllMasterListItems: boolean;
}
