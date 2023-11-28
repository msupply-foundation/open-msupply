import { Document } from './document';
import { Utils } from './utils';

export const useTemperatureLog = {
  document: {
    list: Document.useTemperatureLogs,
  },
  utils: {
    api: Utils.useTemperatureLogApi,
  },
};
