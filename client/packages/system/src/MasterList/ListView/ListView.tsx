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
  TooltipTextCell,
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
  } = useUrlQueryParams({ filters: [{ key: 'name' }] });
  const { data, isError, isLoading } = useMasterList.document.list();
  const pagination = { page, first, offset };
  const navigate = useNavigate();
  const t = useTranslation('catalogue');
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
      <AppBarButtons />
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

export const MasterListListView: FC = () => (
  <TableProvider<MasterListRowFragment>
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore<MasterListRowFragment>({
      initialSortBy: { key: 'name' },
    })}
  >
    <MasterListComponent />
  </TableProvider>
);
