import { ProgramSortFieldInput, useQuery } from '@openmsupply-client/common';
import { IMMUNISATION_PROGRAM } from './keys';
import { useProgramsGraphQL } from '../useProgramsGraphQL';

export function useImmunisationProgram(id?: string) {
  const { data, isLoading, error } = useGet(id ?? '');

  return {
    query: { data, isLoading, error },
  };
}

const useGet = (id: string) => {
  const { api, storeId } = useProgramsGraphQL();

  const queryFn = async () => {
    const result = await api.programs({
      storeId,
      first: 1,
      offset: 0,
      key: ProgramSortFieldInput.Name,
      desc: false,
      filter: { id: { equalTo: id } },
    });

    if (result.programs.__typename === 'ProgramConnector') {
      // Coalesce to null: TanStack Query forbids a queryFn resolving to
      // undefined (empty nodes / non-connector result would crash the page).
      return result.programs.nodes[0] ?? null;
    }
    return null;
  };

  const query = useQuery({
    queryKey: [IMMUNISATION_PROGRAM, id],
    queryFn,
    enabled: id !== '',
  });

  return query;
};
