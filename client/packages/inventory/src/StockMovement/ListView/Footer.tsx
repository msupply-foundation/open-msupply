import React, { memo, useState } from 'react';
import {
  Action,
  ActionsFooter,
  DeleteIcon,
  PrinterIcon,
  PrintFormat,
  ReportContext,
  LocaleKey,
  useTranslation,
  AppFooterPortal,
  useDeleteConfirmation,
  StockRelocationNodeStatus,
} from '@openmsupply-client/common';
import {
  ReportOption,
  ReportRowFragment,
  SelectReportModal,
  usePrintReport,
  useReportList,
} from '@openmsupply-client/system';
import { StockMovementRowFragment, useDeleteStockMovements } from '../api';

export const FooterComponent = ({
  selectedRows,
  resetRowSelection,
}: {
  selectedRows: StockMovementRowFragment[];
  resetRowSelection: () => void;
}) => {
  const t = useTranslation();
  const { deleteStockMovements } = useDeleteStockMovements();

  const { data: reportData } = useReportList({
    context: ReportContext.StockMovement,
  });
  const { printAsync, isPrinting } = usePrintReport();
  const [showReportSelector, setShowReportSelector] = useState(false);

  const reports = reportData?.nodes ?? [];

  const reportOptions: ReportOption[] = reports.map(report => ({
    ...report,
    label: t(`report-code.${report.code}` as LocaleKey, report.name),
  }));

  const printReport = (
    report: ReportRowFragment,
    format: PrintFormat = PrintFormat.Html
  ) => {
    printAsync({
      reportId: report.id,
      dataId: '',
      args: { relocationIds: selectedRows.map(row => row.id) },
      format,
    });
  };

  const onPrint = () => setShowReportSelector(true);

  const confirmAndDelete = useDeleteConfirmation({
    selectedRows,
    deleteAction: async () => {
      await deleteStockMovements(selectedRows.map(row => row.id));
      resetRowSelection();
    },
    canDelete: selectedRows.every(
      row => row.status === StockRelocationNodeStatus.New
    ),
    messages: {
      confirmMessage: t('messages.confirm-delete-stock-movements', {
        count: selectedRows.length,
      }),
      deleteSuccess: t('messages.deleted-stock-movements', {
        count: selectedRows.length,
      }),
      cantDelete: t('messages.cant-delete-finalised-stock-movements'),
    },
  });

  const actions: Action[] = [
    {
      label: t('button.delete-lines'),
      icon: <DeleteIcon />,
      onClick: confirmAndDelete,
    },
    {
      label: t('button.print'),
      icon: <PrinterIcon />,
      onClick: onPrint,
      loading: isPrinting,
    },
  ];

  return (
    <>
      <AppFooterPortal
        Content={
          <>
            {selectedRows.length !== 0 && (
              <ActionsFooter
                actions={actions}
                selectedRowCount={selectedRows.length}
                resetRowSelection={resetRowSelection}
              />
            )}
          </>
        }
      />
      {showReportSelector && (
        <SelectReportModal
          reportOptions={reportOptions}
          onSelectReport={(report, format) => printReport(report, format)}
          onClose={() => setShowReportSelector(false)}
        />
      )}
    </>
  );
};

export const Footer = memo(FooterComponent);
