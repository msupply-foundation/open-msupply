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
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { useMasterList, MasterListRowFragment } from '../api';

const MasterListComponent: FC = () => {
  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset },
  } = useUrlQueryParams({ filterKey: 'name' });
  const { data, isError, isLoading } = useMasterList.document.list();
  const pagination = { page, first, offset };
  const navigate = useNavigate();
  const t = useTranslation('catalogue');
  const columns = useColumns<MasterListRowFragment>(
    ['name', 'description'],
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons sortBy={sortBy} />
      <DataTable
        id="master-list-list"
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={updatePaginationQuery}
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
