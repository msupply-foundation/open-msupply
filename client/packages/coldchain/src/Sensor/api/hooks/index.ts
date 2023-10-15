import { Document } from './document';
import { Utils } from './utils';

export const useSensor = {
  document: {
    list: Document.useSensors,
  },
  utils: {
    api: Utils.useSensorApi,
  },
};
