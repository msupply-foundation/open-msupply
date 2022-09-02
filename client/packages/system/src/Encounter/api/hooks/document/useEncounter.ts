import { useMutation } from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';
import { useEncounterId } from '../utils/useEncounterId';

export const useEncounter = () => {
  const api = useEncounterApi();
  const id = useEncounterId();

  return {
    ...useMutation(api.keys.detail(id), () => api.get.byId(id)),
  };
};
