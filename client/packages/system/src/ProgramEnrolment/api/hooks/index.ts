import { Document } from './document';
import { Utils } from './utils';

export const useProgramEnrolment = {
  utils: {
    api: Utils.usePatientEnrolmentApi,
  },

  document: {
    list: Document.useProgramEnrolments,
    insert: Document.useInsertProgramEnrolment,
    update: Document.useUpdateProgramEnrolment,
  },
};
