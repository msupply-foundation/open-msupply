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
  useEditModal,
} from '@openmsupply-client/common';
import { AppBarButtons } from './AppBarButtons';
import { useAllReportVersionsList } from '../api/hooks/useAllReportVersionsList';
import { ReportRowFragment } from 'packages/system/src/Report';
import { ReportUploadModal } from './ReportUploadModal';

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

  const { isOpen, onClose, onOpen } = useEditModal();

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
        label: 'label.status',
        key: 'isActive',
        accessor: ({ rowData }) => {
          const { isActive } = rowData;
          return t(isActive ? 'label.active' : 'label.inactive');
        },
        width: 150,
        sortable: false,
      },
      {
        label: 'label.is_custom',
        key: 'isCustom',
        width: 150,
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
      <AppBarButtons onOpen={onOpen} />
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
      {isOpen && <ReportUploadModal isOpen={isOpen} onClose={onClose} />}
    </>
  );
};

export const ReportsList = () => (
  <TableProvider createStore={createTableStore}>
    <ReportsComponent />
  </TableProvider>
);
