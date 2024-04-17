import { Utils } from './utils';
import { Document } from './document';

export const useAssetData = {
  utils: {
    classes: Utils.useAssetClasses,
    categories: Utils.useAssetCategories,
    types: Utils.useAssetTypes,
    properties: Utils.useAssetCatalogueProperties,
  },

  document: {
    get: Document.useAsset,
    infiniteList: Document.useInfiniteAssets,
    list: Document.useAssets,
    listAll: Document.useAssetsAll,

    fields: Document.useAssetFields,
    insert: Document.useAssetItemInsert,
    insertProperty: Document.useAssetItemPropertyInsert,
    delete: Document.useAssetsDelete,
  },

  line: {},
};
