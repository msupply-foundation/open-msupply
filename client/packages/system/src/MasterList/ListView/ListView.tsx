import React, { FC } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  useNavigate,
  NothingHere,
  useTranslation,
  createQueryParamsStore,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { useMasterList, MasterListRowFragment } from '../api';

const MasterListComponent: FC = () => {
  const { data, isError, isLoading, pagination, filter, sort } =
    useMasterList.document.list();
  const { sortBy, onChangeSortBy } = sort;
  const navigate = useNavigate();
  const t = useTranslation('catalogue');
  const columns = useColumns<MasterListRowFragment>(
    ['code', 'name', 'description'],
    {
      onChangeSortBy,
      sortBy,
    },
    [onChangeSortBy, sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons sortBy={sortBy} />
      <DataTable
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={pagination.onChangePage}
        columns={columns}
        data={data?.nodes}
        isError={isError}
        isLoading={isLoading}
        onRowClick={row => navigate(row.id)}
        noDataElement={<NothingHere body={t('error.no-master-lists')} />}
      />
    </>
  );
};

export const MasterListListView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<MasterListRowFragment>({
      initialSortBy: { key: 'name' },
    })}
  >
    <MasterListComponent />
  </TableProvider>
);
