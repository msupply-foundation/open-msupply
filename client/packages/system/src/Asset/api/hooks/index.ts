import { Utils } from './utils';
export * from './useAssetList';
export * from './useAssetInsert';
export * from './useAssetLogReasonList';
export * from './useAssetLogReason';
export * from './useAssetCategories';
export * from './useAssetClasses';
export * from './useAssetProperties';

export const useAssetData = {
  utils: {
    types: Utils.useAssetTypes,
  },

  line: {},
};
