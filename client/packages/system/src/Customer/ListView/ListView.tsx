import { Environment } from '@openmsupply-client/config';
import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TableProvider,
  DataTable,
  useListData,
  Name,
  useColumns,
  ListApi,
  createTableStore,
  SortBy,
  getSdk,
  GraphQLClient,
  NameSortFieldInput,
} from '@openmsupply-client/common';

const client = new GraphQLClient(Environment.API_URL);
const api = getSdk(client);

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

  const { names } = await api.names({
    first,
    offset,
    key,
    desc: sortBy.isDesc,
  });

  if (names.__typename === 'NameConnector') {
    return names;
  }

  throw new Error(names.error.description);
};

const Api: ListApi<Name> = {
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

export const ListView: FC = () => {
  const {
    totalCount,
    data,
    isLoading,
    onChangePage,
    pagination,
    sortBy,
    onChangeSortBy,
  } = useListData({ key: NameSortFieldInput.Name }, ['names', 'list'], Api);
  const navigate = useNavigate();

  const columns = useColumns<Name>(['name', 'code'], {
    sortBy,
    onChangeSortBy,
  });

  return (
    <TableProvider createStore={createTableStore}>
      <DataTable
        pagination={{ ...pagination, total: totalCount }}
        onChangePage={onChangePage}
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        onRowClick={row => {
          navigate(`/distribution/customer/${row.id}`);
        }}
      />
    </TableProvider>
  );
};
