import { Document } from './document';
import { Utils } from './utils';

export const useCurrency = {
  document: {
    list: Document.useCurrencies,
  },
  utils: {
    api: Utils.useCurrencyApi,
  },
};
