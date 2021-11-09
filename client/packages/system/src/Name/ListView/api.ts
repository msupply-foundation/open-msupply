import {
  Name,
  ListApi,
  SortBy,
  NameSortFieldInput,
  NamesQuery,
  OmSupplyApi,
} from '@openmsupply-client/common';

const namesGuard = (namesQuery: NamesQuery) => {
  if (namesQuery.names.__typename === 'NameConnector') {
    return namesQuery.names;
  }
  throw new Error(namesQuery.names.error.description);
};

const onRead =
  (api: OmSupplyApi) =>
  async ({
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

export const getNameListViewApi = (api: OmSupplyApi): ListApi<Name> => ({
  onRead:
    ({ first, offset, sortBy }) =>
    () =>
      onRead(api)({ first, offset, sortBy }),
  // TODO: Mutations!
  onDelete: async () => [''],
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  onUpdate: async () => {},
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  onCreate: async () => {},
});
