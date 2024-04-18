import { Document } from './document';
import { Utils } from './utils';

export const useTemperatureBreach = {
  document: {
    list: Document.useTemperatureBreaches,
    update: Document.useUpdateTemperatureBreach,
  },
  utils: {
    api: Utils.useTemperatureBreachApi,
  },
};
