import React, { useCallback, useState } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useTranslation,
  useUrlQueryParams,
  ReportContext,
  LoadingButton,
  PrinterIcon,
} from '@openmsupply-client/common';
import { JsonData } from '@openmsupply-client/programs';
import { useReport, ReportRowFragment } from '../api';
import { Toolbar } from './Toolbar';
import { ReportArgumentsModal } from '../components/ReportArgumentsModal';

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
  const [reportWithArgs, setReportWithArgs] = useState<
    ReportRowFragment | undefined
  >();
  const [currentReportId, setCurrentReportId] = useState<string>('');

  const columns = useColumns<ReportRowFragment>(
    [
      'name',
      {
        accessor: ({ rowData }) => rowData.context,
        key: 'context',
        label: 'label.context',
        sortable: false,
        width: 250,
      },
      {
        Cell: ({ rowData }) => (
          <LoadingButton
            onClick={() => onReportSelected(rowData)}
            isLoading={isPrinting && currentReportId === rowData.id}
            startIcon={<PrinterIcon />}
            sx={{ margin: 1 }}
          >
            {t('button.print')}
          </LoadingButton>
        ),
        key: 'print',
        width: 150,
      },
    ],
    {
      sortBy,
      onChangeSortBy: updateSortQuery,
    },
    [sortBy]
  );

  const onReportSelected = useCallback(
    (report: ReportRowFragment | undefined) => {
      if (report === undefined) {
        return;
      }
      setCurrentReportId(report.id);
      if (report.argumentSchema) {
        setReportWithArgs(report);
      } else {
        printReport(report, undefined);
      }
    },
    []
  );

  const { print, isPrinting } = useReport.utils.print();

  const printReport = (
    report: ReportRowFragment,
    args: JsonData | undefined
  ) => {
    print({ reportId: report.id, dataId: '', args });
  };

  return (
    <>
      <Toolbar filter={filter} />
      <DataTable
        id="item-list"
        pagination={{ ...pagination, total: data?.totalCount }}
        onChangePage={updatePaginationQuery}
        columns={columns}
        data={data?.nodes}
        isError={isError}
        isLoading={isLoading}
        noDataElement={<NothingHere body={t('error.no-items')} />}
      />
      <ReportArgumentsModal
        report={reportWithArgs}
        onReset={() => setReportWithArgs(undefined)}
        onArgumentsSelected={printReport}
      />
    </>
  );
};

export const ReportListView = ({ context }: { context: ReportContext }) => (
  <TableProvider createStore={createTableStore}>
    <ReportListComponent context={context} />
  </TableProvider>
);
