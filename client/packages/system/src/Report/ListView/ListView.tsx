import React, { useCallback, useEffect, useState } from 'react';
import {
  TableProvider,
  DataTable,
  useColumns,
  createTableStore,
  NothingHere,
  useTranslation,
  useUrlQueryParams,
  ReportContext,
  PrinterIcon,
  BaseButton,
  useDialog,
  BasicSpinner,
  useDebouncedValue,
  TooltipTextCell,
} from '@openmsupply-client/common';
import { JsonData } from '@openmsupply-client/programs';
import { useReport, ReportRowFragment } from '../api';
import { Toolbar } from './Toolbar';
import { ReportArgumentsModal } from '../components/ReportArgumentsModal';

const PrintingDialog: React.FC<{ isPrinting: boolean }> = ({ isPrinting }) => {
  const { Modal, showDialog, hideDialog } = useDialog();

  useEffect(() => {
    if (isPrinting) {
      showDialog();
    } else {
      hideDialog();
    }
  }, [hideDialog, isPrinting, showDialog]);

  return (
    <Modal title="" height={200}>
      <BasicSpinner messageKey="messages.fetching-report-data"></BasicSpinner>
    </Modal>
  );
};

const PrintButton = ({
  report,
  onReportSelected,
  isPrinting,
}: {
  report: ReportRowFragment;
  onReportSelected: (report?: ReportRowFragment) => void;
  isPrinting: boolean;
}) => {
  const t = useTranslation();
  const onClick = () => {
    onReportSelected(report);
  };

  return (
    <BaseButton
      onClick={onClick}
      startIcon={<PrinterIcon />}
      sx={{ margin: 1 }}
      disabled={isPrinting}
    >
      {t('button.print')}
    </BaseButton>
  );
};

const ReportListComponent = ({ context }: { context: ReportContext }) => {
  const {
    filter,
    updateSortQuery,
    updatePaginationQuery,
    queryParams: { sortBy, page, first, offset, filterBy },
  } = useUrlQueryParams({
    initialSort: { key: 'name', dir: 'asc' },
    filters: [{ key: 'name' }],
  });
  const queryParams = { filterBy, offset, sortBy };
  const { data, isError, isLoading } = useReport.document.list({
    context,
    queryParams,
  });
  const pagination = { page, first, offset };
  const t = useTranslation();
  const [reportWithArgs, setReportWithArgs] = useState<
    ReportRowFragment | undefined
  >();
  const { print, isPrinting } = useReport.utils.print();

  // Wait a little bit before showing the modal, e.g. when the report prints very quickly, don't
  // show the modal.
  const debouncedIsPrinting = useDebouncedValue(isPrinting, 300);

  const columns = useColumns<ReportRowFragment>(
    [
    ['name', { width: 300, Cell: TooltipTextCell }],
      {
        accessor: ({ rowData }) => rowData.context,
        key: 'context',
        label: 'label.context',
        sortable: false,
        width: 60,
      },
      {
        Cell: ({ rowData }) => (
          <PrintButton
            onReportSelected={onReportSelected}
            report={rowData}
            isPrinting={isPrinting}
          />
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

  const printReport = useCallback(
    (report: ReportRowFragment, args: JsonData | undefined) => {
      print({ reportId: report.id, dataId: '', args });
    },
    [print]
  );

  const onReportSelected = useCallback(
    (report: ReportRowFragment | undefined) => {
      if (report === undefined) {
        return;
      }
      if (report.argumentSchema) {
        setReportWithArgs(report);
      } else {
        printReport(report, undefined);
      }
    },
    [printReport]
  );

  return (
    <>
      <Toolbar filter={filter} />
      <DataTable
        id="item-list"
        pagination={{ ...pagination, total: data?.totalCount ?? 0 }}
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
      <PrintingDialog isPrinting={debouncedIsPrinting && isPrinting} />
    </>
  );
};

export const ReportListView = ({ context }: { context: ReportContext }) => (
  <TableProvider createStore={createTableStore}>
    <ReportListComponent context={context} />
  </TableProvider>
);
