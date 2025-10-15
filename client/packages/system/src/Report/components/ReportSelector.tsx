import React, { useMemo } from 'react';
import {
  PrintFormat,
  PrintReportSortInput,
  ReportContext,
  useEditModal,
  useIntlUtils,
  useToggle,
  useTranslation,
} from '@openmsupply-client/common';
import { PrinterIcon } from '@common/icons';
import { LoadingButton } from '@common/components';
import { ReportArgumentsModal } from './ReportArgumentsModal';
import { ReportListParams, usePrintReport, useReportList } from '../api/hooks';
import { ReportRowFragment } from '../api';
import { ReportOption, SelectReportModal } from './SelectReportModal';
import { JsonData } from '@openmsupply-client/programs';

interface ReportSelectorProps {
  context?: ReportContext;
  subContext?: string;
  dataId: string;
  queryParams?: ReportListParams;
  extraArguments?: Record<string, string | number | undefined>;
  sort?: PrintReportSortInput;
  CustomButton?: (props: {
    onPrint: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  }) => JSX.Element;
}

export const ReportSelector = ({
  context,
  subContext,
  queryParams,
  extraArguments,
  dataId,
  sort,
  CustomButton,
}: ReportSelectorProps) => {
  const t = useTranslation();
  const { translateDynamicKey } = useIntlUtils();
  const modalOpen = useToggle();

  const {
    entity: reportWithArgs,
    onOpen: onOpenArguments,
    onClose,
  } = useEditModal<{
    report: ReportRowFragment;
    format: PrintFormat;
  }>();

  const { data, isLoading: initialLoading } = useReportList({
    context,
    subContext,
    queryParams,
  });

  const { printAsync, isPrinting } = usePrintReport();

  const print = async (
    report: ReportRowFragment,
    args: JsonData,
    format?: PrintFormat
  ) => {
    try {
      await printAsync({
        reportId: report.id,
        dataId,
        args,
        sort,
        format,
      });
    } catch (err) {
      // Error is already displayed by global graphql error handler, we just need to catch
    }
  };

  const handleReportSelected = async (
    report: ReportOption,
    format: PrintFormat
  ) => {
    if (report.argumentSchema) {
      onOpenArguments({
        report,
        format,
      });
    } else {
      const timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
      await print(report, { timezone, ...extraArguments }, format);
    }
  };

  const options: ReportOption[] = useMemo(() => {
    return data
      ? data?.nodes?.map(report => ({
          ...report,
          label: translateDynamicKey(`report-code.${report.code}`, report.name),
        }))
      : [];
  }, [data]);

  return (
    <>
      {CustomButton ? (
        <CustomButton onPrint={modalOpen.toggleOn} />
      ) : (
        <LoadingButton
          disabled={initialLoading || !dataId}
          isLoading={isPrinting}
          startIcon={<PrinterIcon />}
          onClick={modalOpen.toggleOn}
          label={t('button.export-or-print')}
        />
      )}
      {modalOpen.isOn && (
        <SelectReportModal
          onSelectReport={handleReportSelected}
          reportOptions={options}
          onClose={modalOpen.toggleOff}
        />
      )}
      <ReportArgumentsModal
        report={reportWithArgs?.report}
        printFormat={reportWithArgs?.format}
        onReset={onClose}
        onArgumentsSelected={print}
        extraArguments={extraArguments}
      />
    </>
  );
};
