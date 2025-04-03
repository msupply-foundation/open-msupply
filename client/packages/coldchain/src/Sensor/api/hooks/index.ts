import { Document } from './document';
import { Utils } from './utils';
export * from './useSensorList';

export const useSensor = {
  document: {
    update: Document.useSensorUpdate,
  },
  utils: {
    api: Utils.useSensorApi,
  },
};
