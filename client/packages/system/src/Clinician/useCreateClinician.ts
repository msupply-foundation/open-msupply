import { InsertClinicianInput } from '@common/types';
import { useState } from 'react';

type DraftClinician = Omit<InsertClinicianInput, 'id'>;

export const useCreateClinician = () => {
  const [clinician, setClinician] = useState<DraftClinician>({
    firstName: '',
    lastName: '',
    code: '',
    initials: '',
  });

  const isValid =
    !!clinician.code && !!clinician.lastName && !!clinician.initials;

  const save = () => {
    console.log(clinician);
    setClinician({
      firstName: '',
      lastName: '',
      code: '',
      initials: '',
    });
  };

  const updateDraft = (updatedFields: Partial<DraftClinician>) => {
    setClinician(prev => ({ ...prev, ...updatedFields }));
  };

  return {
    isValid,
    draft: clinician,
    updateDraft,
    save,
  };
};
