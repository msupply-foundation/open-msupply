import React from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useTranslation,
  useUrlQueryParams,
  ReportContext,
} from '@openmsupply-client/common';
import { useReport, ReportRowFragment } from '../api';
import { Toolbar } from './Toolbar';

const ReportListComponent = ({ context }: { context: ReportContext }) => {
  const {
    filter,
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
    filterKey: 'name',
  });
  const queryParams = { filterBy, offset, sortBy };
  const { data, isError, isLoading } = useReport.document.list({
    context,
    queryParams,
  });
  const pagination = { page, first, offset };
  const t = useTranslation('common');

  const columns = useColumns<ReportRowFragment>(
    [
      'name',
      {
        accessor: ({ rowData }) => rowData.context,
        key: 'context',
        label: 'label.context',
        sortable: false,
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
      <Toolbar filter={filter} />
      <DataTable
        id="report-list"
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        isError={isError}
        isLoading={isLoading}
        noDataElement={<NothingHere body={t('error.no-items')} />}
      />
    </>
  );
};

export const ReportListView = ({ context }: { context: ReportContext }) => (
  <TableProvider createStore={createTableStore}>
    <ReportListComponent context={context} />
  </TableProvider>
);
