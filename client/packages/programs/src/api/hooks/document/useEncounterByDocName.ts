import { useQuery } from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';

export const useEncounterByDocName = (documentName: string | undefined) => {
  const api = useEncounterApi();

  return useQuery({
    queryKey: api.keys.byDocName(documentName ?? ''),
    queryFn: () => api.byDocName(documentName ?? ''),
    enabled: !!documentName
  });
};
