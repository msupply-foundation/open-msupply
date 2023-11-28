import { Document } from './document';
import { Utils } from './utils';

export const useTemperatureBreach = {
  document: {
    list: Document.useTemperatureBreaches,
    notifications: Document.useTemperatureBreachNotifications,
  },
  utils: {
    api: Utils.useTemperatureBreachApi,
  },
};
