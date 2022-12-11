import { useMutation } from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';
import { useEncounterIdFromUrl } from '../utils/useEncounterIdFromUrl';

export const useEncounterById = () => {
  const api = useEncounterApi();
  const id = useEncounterIdFromUrl();

  return {
    ...useMutation(api.keys.detail(id), () => api.byId(id)),
  };
};
