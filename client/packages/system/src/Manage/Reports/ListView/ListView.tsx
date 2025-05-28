import React from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useUrlQueryParams,
  useTranslation,
  TooltipTextCell,
} from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButtons';
import { useAllReportVersionsList } from '../hooks/useAllReportVersionsList';
import { ReportRowFragment } from 'packages/system/src/Report';

const ReportsComponent = () => {
  const t = useTranslation();
  const {
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({ initialSort: { key: 'code', dir: 'asc' } });

  const queryParams = { sortBy, first, offset, filterBy };
  const {
    query: { data, isError, isLoading },
  } = useAllReportVersionsList({
    queryParams,
  });

  const pagination = { page, first, offset };

  const columns = useColumns<ReportRowFragment>(
    [
      {
        key: 'name',
        label: 'label.name',
        width: 150,
        sortable: true,
        Cell: TooltipTextCell,
      },
      {
        key: 'code',
        label: 'label.code',
        width: 150,
        sortable: true,
        Cell: TooltipTextCell,
      },
      {
        key: 'version',
        label: 'label.version',
        width: 150,
        sortable: true,
      },
      {
        key: 'isActive',
        label: 'label.is_active',
        width: 150,
        sortable: true,
      },
      {
        key: 'isCustom',
        label: 'label.is_custom',
        width: 150,
        sortable: true,
      },
    ],
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [sortBy]
  );

  return (
    <>
      <AppBarButtons />
      <DataTable
        id="report-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        isLoading={isLoading}
        isError={isError}
        noDataElement={<NothingHere body={t('error.no-reports')} />}
      />
    </>
  );
};

export const ReportsList = () => (
  <TableProvider createStore={createTableStore}>
    <ReportsComponent />
  </TableProvider>
);
