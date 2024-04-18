import { Utils } from './utils';
import { Document } from './document';
import { Log } from './log';

export const useAssetData = {
  utils: {
    classes: Utils.useAssetClasses,
    categories: Utils.useAssetCategories,
    types: Utils.useAssetTypes,
  },

  document: {
    get: Document.useAsset,
    infiniteList: Document.useInfiniteAssets,
    list: Document.useAssets,
    listAll: Document.useAssetsAll,

    fields: Document.useAssetFields,
    insert: Document.useAssetItemInsert,
    delete: Document.useAssetsDelete,
  },

  log: {
    listReasons: Log.useAssetLogReasons,
    insertReasons: Log.useAssetLogReasonInsert,
    deleteReason: Log.useAssetLogReasonsDelete,
  },

  line: {},
};
