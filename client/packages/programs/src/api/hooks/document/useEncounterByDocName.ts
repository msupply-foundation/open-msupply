import { useQuery } from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';

export const useEncounterByDocName = (documentName: string | undefined) => {
  const api = useEncounterApi();

  return {
    ...useQuery(api.keys.byDocName(documentName ?? ''), () =>
      api.byDocName(documentName ?? '')
    ),
  };
};
