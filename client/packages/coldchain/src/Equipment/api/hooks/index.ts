import { Document } from './document';
import { Log } from './log';

export const useAssets = {
  utils: {},

  document: {
    fetch: Document.useFetchAssetById,
    get: Document.useAsset,
    list: Document.useAssets,
    listAll: Document.useAssetsAll,

    fields: Document.useAssetFields,

    insert: Document.useAssetInsert,
    delete: Document.useAssetDelete,
    deleteAssets: Document.useAssetsDelete,
    update: Document.useAssetUpdate,
  },

  log: { insert: Log.useAssetLogInsert, list: Log.useAssetLogs },
};
