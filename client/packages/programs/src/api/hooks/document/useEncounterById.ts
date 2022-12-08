import { useMutation } from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';

export const useEncounterById = (encounterId: string) => {
  const api = useEncounterApi();

  return {
    ...useMutation(api.keys.detail(encounterId), () => api.byId(encounterId)),
  };
};
