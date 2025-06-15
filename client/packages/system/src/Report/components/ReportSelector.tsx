import React, { FC, PropsWithChildren, useMemo } from 'react';
import {
  PrintFormat,
  ReportContext,
  useEditModal,
  useIntlUtils,
  useToggle,
  useTranslation,
} from '@openmsupply-client/common';
import { PrinterIcon } from '@common/icons';
import { LoadingButton } from '@common/components';
import { ReportArgumentsModal } from './ReportArgumentsModal';
import { JsonData } from '@openmsupply-client/programs';
import { ReportListParams, useReportList } from '../api/hooks';
import { ReportRowFragment } from '../api';
import { ReportOption, SelectReportModal } from './SelectReportModal';

interface CustomOption<T> {
  label: string;
  value?: T;
  isDisabled?: boolean;
  onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void;
}
interface ReportSelectorProps {
  context?: ReportContext;
  subContext?: string;
  onPrint: (
    report: ReportRowFragment,
    args: JsonData | undefined,
    format?: PrintFormat
  ) => Promise<void>;
  isPrinting?: boolean;
  /** Disable the whole control */
  disabled?: boolean;
  queryParams?: ReportListParams;
  extraArguments?: Record<string, string | number | undefined>;
  customOptions?: CustomOption<string>[];
  onPrintCustom?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  buttonLabel?: string;
}

export const ReportSelector: FC<PropsWithChildren<ReportSelectorProps>> = ({
  context,
  subContext,
  onPrint,
  isPrinting,
  disabled = false,
  queryParams,
  extraArguments,
  customOptions,
  onPrintCustom,
  buttonLabel,
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

  // Report Content
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
      await print(report, undefined, format);
    }
  };

  const print = async (
    report: ReportRowFragment,
    args: Record<string, any> = {},
    format: PrintFormat
  ) => {
    const timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    await onPrint(report, { timezone, ...extraArguments, ...args }, format);
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
        isLoading={isPrinting || false}
        startIcon={<PrinterIcon />}
        onClick={modalOpen.toggleOn}
        label={buttonLabel || t('button.export-or-print')} // buttonLabel??
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
        onArgumentsSelected={onPrint}
      />
    </>
  );
};
