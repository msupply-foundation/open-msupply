import { Utils } from './utils';
export * from './useAssetList';
export * from './useAssetInsert';
export * from './useAssetLogReasonList';
export * from './useAssetLogReason';
export * from './useAssetCategories';
export * from './useAssetClasses';

export const useAssetData = {
  utils: {
    types: Utils.useAssetTypes,
    properties: Utils.useAssetProperties,
  },

  line: {},
};
