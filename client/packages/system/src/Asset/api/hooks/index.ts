import { Utils } from './utils';
import { Log } from './log';
export * from './useAssetList';
export * from './useAsset';

export const useAssetData = {
  utils: {
    classes: Utils.useAssetClasses,
    categories: Utils.useAssetCategories,
    types: Utils.useAssetTypes,
    properties: Utils.useAssetProperties,
  },

  log: {
    listReasons: Log.useAssetLogReasons,
    insertReasons: Log.useAssetLogReasonInsert,
    deleteReason: Log.useAssetLogReasonsDelete,
  },

  line: {},
};
