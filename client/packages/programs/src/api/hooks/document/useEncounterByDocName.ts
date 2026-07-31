import { useQuery } from '@openmsupply-client/common';
import { useEncounterApi } from '../utils/useEncounterApi';

export const useEncounterByDocName = (documentName: string | undefined) => {
  const api = useEncounterApi();

  return useQuery({
    queryKey: api.keys.byDocName(documentName ?? ''),
    // Coalesce to null: api.byDocName returns undefined when no encounter
    // matches, which TanStack Query forbids and would crash the page.
    queryFn: async () => (await api.byDocName(documentName ?? '')) ?? null,
    enabled: !!documentName
  });
};
