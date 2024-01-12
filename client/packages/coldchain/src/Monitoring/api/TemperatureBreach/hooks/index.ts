import { Document } from './document';
import { Utils } from './utils';

export const useTemperatureBreach = {
  document: {
    list: Document.useTemperatureBreaches,
  },
  utils: {
    api: Utils.useTemperatureBreachApi,
  },
};
