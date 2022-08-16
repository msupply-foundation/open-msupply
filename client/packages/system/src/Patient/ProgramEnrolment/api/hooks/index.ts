import { Document } from './document';
import { Utils } from './utils';

export const useProgramEnrolment = {
  utils: {
    api: Utils.useProgramEnrolmentApi,
  },

  document: {
    list: Document.useProgramEnrolments,
    listAll: Document.useProgramEnrolmentsAll,
    insert: Document.useInsertProgramEnrolment,
    update: Document.useUpdateProgramEnrolment,
  },
};
