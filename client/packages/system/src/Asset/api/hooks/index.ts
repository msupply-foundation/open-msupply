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
    infiniteList: Document.useInfiniteAssets,
    list: Document.useAssets,
    listAll: Document.useAssetsAll,

    fields: Document.useAssetFields,
  },

  line: {},
};
