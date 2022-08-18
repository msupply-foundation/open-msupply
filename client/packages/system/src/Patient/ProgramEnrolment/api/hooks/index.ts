import { Document } from './document';
import { Utils } from './utils';

export const useProgramEnrolment = {
  utils: {
    api: Utils.useProgramEnrolmentApi,
  },

  document: {
    insert: Document.useInsertProgramEnrolment,
    update: Document.useUpdateProgramEnrolment,
  },
};
