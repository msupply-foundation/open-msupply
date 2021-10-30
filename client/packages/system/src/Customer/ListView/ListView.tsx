import { Environment } from '@openmsupply-client/config';
import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TableProvider,
  DataTable,
  useListData,
  request,
  Name,
  gql,
  useColumns,
  ListApi,
  createTableStore,
  SortBy,
  useContentAreaHeight,
} from '@openmsupply-client/common';

const getNameListQuery = (): string => gql`
  query names(
    $first: Int
    $offset: Int
    $key: NameSortFieldInput!
    $desc: Boolean
  ) {
    names(
      page: { first: $first, offset: $offset }
      sort: { key: $key, desc: $desc }
      filter: { isCustomer: true }
    ) {
      ... on NameConnector {
        nodes {
          id
          code
          name
          isSupplier
          isCustomer
        }
        totalCount
      }
    }
  }
`;

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
  // TODO: Need to add a `sortByKey` to the Column type
  const key = sortBy.key === 'name' ? 'NAME' : 'CODE';

  const { names } = await request(Environment.API_URL, getNameListQuery(), {
    first,
    offset,
    key,
    desc: sortBy.isDesc,
  });

  return names;
};

const Api: ListApi<Name> = {
  onQuery:
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
  const contentHeight = useContentAreaHeight();
  const tableHeight = contentHeight - 40;
  const {
    totalCount,
    data,
    isLoading,
    onChangePage,
    pagination,
    sortBy,
    onChangeSortBy,
  } = useListData({ key: 'NAME' }, ['names', 'list'], Api);
  const navigate = useNavigate();

  const columns = useColumns<Name>(['name', 'code'], {
    sortBy,
    onChangeSortBy,
  });

  return (
    <TableProvider createStore={createTableStore}>
      <DataTable
        height={tableHeight}
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
