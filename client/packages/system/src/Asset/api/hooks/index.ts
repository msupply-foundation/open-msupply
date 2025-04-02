import { Utils } from './utils';
export * from './useAssetList';
export * from './useAssetInsert';
export * from './useAssetLogReasonList';
export * from './useAssetLogReason';

export const useAssetData = {
  utils: {
    classes: Utils.useAssetClasses,
    categories: Utils.useAssetCategories,
    types: Utils.useAssetTypes,
    properties: Utils.useAssetProperties,
  },

  line: {},
};
