import { Utils } from './utils';
import { Document } from './document';

export const useAssetData = {
  utils: {
    classes: Utils.useAssetClasses,
    categories: Utils.useAssetCategories,
    types: Utils.useAssetTypes,
  },

  document: {
    get: Document.useAsset,
    list: Document.useAssets,
    listAll: Document.useAssetsAll,

    fields: Document.useAssetFields,
    insert: Document.useAssetItemInsert,
    delete: Document.useAssetsDelete,
  },

  line: {},
};
