import {
  Name,
  ListApi,
  SortBy,
  NameSortFieldInput,
  OmSupplyApi,
} from '@openmsupply-client/common';

const onRead =
  (api: OmSupplyApi, type: 'customer' | 'supplier', storeId: string) =>
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
      storeId,
      filter: {
        [type === 'customer' ? 'isCustomer' : 'isSupplier']: true,
      },
    });

    return result.names;
  };

export const getNameListViewApi = (
  api: OmSupplyApi,
  type: 'customer' | 'supplier',
  storeId: string
): ListApi<Name> => ({
  onRead:
    ({ first, offset, sortBy }) =>
    () =>
      onRead(api, type, storeId)({ first, offset, sortBy }),
  // TODO: Mutations!
  onDelete: async () => [''],
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  onUpdate: async () => {},
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  onCreate: async () => {},
});
