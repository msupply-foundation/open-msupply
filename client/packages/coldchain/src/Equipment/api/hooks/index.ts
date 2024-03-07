import { Document } from './document';

export const useAssets = {
  utils: {},

  document: {
    get: Document.useAsset,
    list: Document.useAssets,
    listAll: Document.useAssetsAll,

    fields: Document.useAssetFields,

    insert: Document.useAssetInsert,
    delete: Document.useAssetDelete,
    deleteAssets: Document.useAssetsDelete,
  },

  line: {},
};
