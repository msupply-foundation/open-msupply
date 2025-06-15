import React, { FC, PropsWithChildren, useMemo } from 'react';
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

interface CustomOption<T> {
  label: string;
  value?: T;
  isDisabled?: boolean;
  onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void;
}
interface ReportSelectorProps {
  context?: ReportContext;
  subContext?: string;
  dataId: string;
  /** Disable the whole control */
  disabled?: boolean;
  queryParams?: ReportListParams;
  extraArguments?: Record<string, string | number | undefined>;
  customOptions?: CustomOption<string>[];
  onPrintCustom?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  loading?: boolean;
  customLabel?: string;
  sort?: PrintReportSortInput;
}

export const ReportSelector: FC<PropsWithChildren<ReportSelectorProps>> = ({
  context,
  subContext,
  disabled = false,
  queryParams,
  extraArguments,
  customOptions,
  onPrintCustom,
  loading = false,
  customLabel,
  dataId,
  sort,
}) => {
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

  const onReportSelected = async (
    report: ReportOption,
    format: PrintFormat
    // e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    const selected = customOptions?.find(c => c.value === report.id);
    if (onPrintCustom) {
      // selected?.value ? onPrintCustom(e) : '';
      selected?.value ? onPrintCustom() : '';
    }

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

  const print = async (
    report: ReportRowFragment,
    args: JsonData,
    format?: PrintFormat
  ) => {
    await printAsync({
      reportId: report.id,
      dataId,
      args,
      sort,
      format,
    });
  };

  const options: ReportOption[] = useMemo(() => {
    const reports = data
      ? data?.nodes?.map(report => ({
          ...report,
          label: translateDynamicKey(`report-code.${report.code}`, report.name),
        }))
      : [];

    return reports;
    // const allOptions = [customOptions || [], reports];
    // return allOptions.flat();
  }, [data, disabled, customOptions]);

  return (
    <>
      <LoadingButton
        disabled={initialLoading || disabled}
        isLoading={isPrinting || loading}
        startIcon={<PrinterIcon />}
        onClick={modalOpen.toggleOn}
        label={customLabel || t('button.export-or-print')}
      />
      {modalOpen.isOn && (
        <SelectReportModal
          onSelectReport={onReportSelected}
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
