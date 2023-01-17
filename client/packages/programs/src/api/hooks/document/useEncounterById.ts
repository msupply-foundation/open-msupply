import { useMutation, useQuery } from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';

export const useEncounterById = (encounterId: string | undefined) => {
  const api = useEncounterApi();

  return {
    ...useQuery(
      api.keys.detail(encounterId ?? ''),
      () => api.byId(encounterId ?? ''),
      { enabled: !!encounterId }
    ),
  };
};

export const useEncounterByIdPromise = (encounterId: string | undefined) => {
  const api = useEncounterApi();

  return {
    ...useMutation(() => api.byId(encounterId ?? '')),
  };
};
