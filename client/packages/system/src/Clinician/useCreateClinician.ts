import { useState } from 'react';
import { DraftClinician } from '.';
import { useInsertClinician } from './api/useInsertClinician';

export const useCreateClinician = () => {
  const { isLoading, mutateAsync } = useInsertClinician();

  const [clinician, setClinician] = useState<DraftClinician>({
    firstName: '',
    lastName: '',
    code: '',
    initials: '',
    mobile: '',
  });

  const isValid =
    !!clinician.code && !!clinician.lastName && !!clinician.initials;

  const save = async () => {
    const result = await mutateAsync(clinician);

    clear();

    return result;
  };

  const updateDraft = (updatedFields: Partial<DraftClinician>) => {
    setClinician(prev => ({ ...prev, ...updatedFields }));
  };

  const clear = () => {
    setClinician({
      firstName: '',
      lastName: '',
      code: '',
      initials: '',
      mobile: '',
    });
  };

  return {
    isValid,
    draft: clinician,
    updateDraft,
    save,
    clear,
    isSaving: isLoading,
  };
};
