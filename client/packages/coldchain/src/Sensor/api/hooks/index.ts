import { Document } from './document';
import { Utils } from './utils';

export const useSensor = {
  document: {
    list: Document.useSensors,
    update: Document.useSensorUpdate,
  },
  utils: {
    api: Utils.useSensorApi,
  },
};
