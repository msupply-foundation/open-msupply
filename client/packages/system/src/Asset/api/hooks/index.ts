import { Utils } from './utils';
export * from './useAssetList';
export * from './useAssetInsert';
export * from './useAssetLogReasonList';
export * from './useAssetLogReason';
export * from './useAssetCategories';

export const useAssetData = {
  utils: {
    classes: Utils.useAssetClasses,
    types: Utils.useAssetTypes,
    properties: Utils.useAssetProperties,
  },

  line: {},
};
