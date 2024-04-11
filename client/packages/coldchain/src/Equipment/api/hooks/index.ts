import { Document } from './document';
import { Log } from './log';
import { Utils } from './utils';

export const useAssets = {
  utils: {
    labelPrinterSettings: Utils.useLabelPrinterSettings,
  },

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

  log: {
    insert: Log.useAssetLogInsert,
    list: Log.useAssetLogs,
  },
};
