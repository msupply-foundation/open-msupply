import { Document } from './document';

export const useAssets = {
  utils: {},

  document: {
    get: Document.useAsset,
    list: Document.useAssets,

    fields: Document.useAssetFields,
  },

  line: {},
};
