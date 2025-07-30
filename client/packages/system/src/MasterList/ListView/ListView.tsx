import React from 'react';
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
  TooltipTextCell,
  useAuthContext,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { MasterListRowFragment, useMasterLists } from '../api';

const MasterListComponent = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { store } = useAuthContext();

  const {
    updateSortQuery,
    updatePaginationQuery,
    filter,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({
    filters: [{ key: 'name' }],
  });

  const { data, isError, isLoading } = useMasterLists({
    queryParams: {
      first,
      offset,
      sortBy,
      filterBy: {
        ...filterBy,
        existsForStoreId: { equalTo: store?.id },
      },
    },
  });
  const pagination = { page, first, offset };

  const columns = useColumns<MasterListRowFragment>(
    [
      ['name', { width: 300, Cell: TooltipTextCell }],
      ['description', { minWidth: 100, Cell: TooltipTextCell }],
    ],
    {
      onChangeSortBy: updateSortQuery,
      sortBy,
    },
    [updateSortQuery, sortBy]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <AppBarButtons data={data?.nodes ?? []} />
      <DataTable
        id="master-list-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
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

export const MasterListListView = () => (
  <TableProvider<MasterListRowFragment>
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<MasterListRowFragment>({
      initialSortBy: { key: 'name' },
    })}
  >
    <MasterListComponent />
  </TableProvider>
);
