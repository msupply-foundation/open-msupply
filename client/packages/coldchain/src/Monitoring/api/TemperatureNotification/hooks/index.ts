import { Document } from './document';
import { Utils } from './utils';

export const useTemperatureNotification = {
  document: {
    list: Document.useTemperatureNotifications,
  },
  utils: {
    api: Utils.useTemperatureNotificationApi,
  },
};
