import { useMutation } from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';

export const useEncounterByDocName = (documentName: string | undefined) => {
  const api = useEncounterApi();

  return {
    ...useMutation(() => api.byDocName(documentName ?? '')),
  };
};
