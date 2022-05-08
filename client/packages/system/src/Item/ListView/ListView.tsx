import React, { FC } from 'react';
import {
  useNavigate,
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useTranslation,
  createQueryParamsStore,
} from '@openmsupply-client/common';
import { useItems, ItemRowFragment } from '../api';

const ItemListComponent: FC = () => {
  const { data, isError, isLoading, pagination, sort } = useItems();
  const { sortBy, onChangeSortBy } = sort;
  const navigate = useNavigate();
  const t = useTranslation('catalogue');

  const columns = useColumns<ItemRowFragment>(
    ['name', 'code'],
    {
      sortBy,
      onChangeSortBy,
    },
    [sortBy]
  );

  return (
    <DataTable
      pagination={{ ...pagination, total: data?.totalCount }}
      onChangePage={pagination.onChangePage}
      columns={columns}
      data={data?.nodes}
      isError={isError}
      isLoading={isLoading}
      onRowClick={row => {
        navigate(`/catalogue/items/${row.id}`);
      }}
      noDataElement={<NothingHere body={t('error.no-items')} />}
    />
  );
};

export const ItemListView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<ItemRowFragment>({
      initialSortBy: { key: 'name' },
    })}
  >
    <ItemListComponent />
  </TableProvider>
);
