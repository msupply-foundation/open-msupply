import { Environment } from '@openmsupply-client/config';
import {
  Name,
  ListApi,
  SortBy,
  getSdk,
  GraphQLClient,
  NameSortFieldInput,
  NamesQuery,
} from '@openmsupply-client/common';

const client = new GraphQLClient(Environment.API_URL);
const api = getSdk(client);

const namesGuard = (namesQuery: NamesQuery) => {
  if (namesQuery.names.__typename === 'NameConnector') {
    return namesQuery.names;
  }
  throw new Error(namesQuery.names.error.description);
};

const listQueryFn = async ({
  first,
  offset,
  sortBy,
}: {
  first: number;
  offset: number;
  sortBy: SortBy<Name>;
}): Promise<{
  nodes: Name[];
  totalCount: number;
}> => {
  const key =
    sortBy.key === 'name' ? NameSortFieldInput.Name : NameSortFieldInput.Code;

  const result = await api.names({
    first,
    offset,
    key,
    desc: sortBy.isDesc,
  });

  return namesGuard(result);
};

export const CustomerListViewApi: ListApi<Name> = {
  onRead:
    ({ first, offset, sortBy }) =>
    () =>
      listQueryFn({ first, offset, sortBy }),
  // TODO: Mutations!
  onDelete: async () => {},

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  onUpdate: async () => {},
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  onCreate: async () => {},
};
