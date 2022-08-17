import { Document } from './document';
import { Utils } from './utils';

export const useProgram = {
  utils: {
    api: Utils.useProgramApi,
  },

  document: {
    list: Document.usePrograms,
  },
};
