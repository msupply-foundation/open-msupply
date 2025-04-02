import { Utils } from './utils';
import { Log } from './log';
export * from './useAssetList';
export * from './useAsset';
export * from './useAssetLogReasonList';
export * from './useAssetLogReason';

export const useAssetData = {
  utils: {
    classes: Utils.useAssetClasses,
    categories: Utils.useAssetCategories,
    types: Utils.useAssetTypes,
    properties: Utils.useAssetProperties,
  },

  log: {
    deleteReason: Log.useAssetLogReasonsDelete,
  },

  line: {},
};
