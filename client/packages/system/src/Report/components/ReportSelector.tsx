import React, {
  FC,
  PropsWithChildren,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  ReportContext,
  useIntlUtils,
  useTranslation,
} from '@openmsupply-client/common';
import { PrinterIcon } from '@common/icons';
import { SplitButton, SplitButtonOption } from '@common/components';
import { ReportArgumentsModal } from './ReportArgumentsModal';
import { JsonData } from '@openmsupply-client/programs';
import { ReportListParams, useReportList } from '../api/hooks';
import { ReportRowFragment } from '../api';

interface CustomOption<T> {
  label: string;
  value?: T;
  isDisabled?: boolean;
  onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void;
}
interface ReportSelectorProps {
  context?: ReportContext;
  subContext?: string;
  onPrint: (report: ReportRowFragment, args: JsonData | undefined) => void;
  isPrinting?: boolean;
  /** Disable the whole control */
  disabled?: boolean;
  queryParams?: ReportListParams;
  extraArguments?: Record<string, string | number | undefined>;
  customOptions?: CustomOption<string>[];
  onPrintCustom?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  buttonLabel: string;
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
  const { data, isLoading: initialLoading } = useReportList({
    context,
    subContext,
    queryParams,
  });
  const t = useTranslation();
  const { translateDynamicKey } = useIntlUtils();

  // Report Content
  const onReportSelected = (
    option: SplitButtonOption<string> | undefined,
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (option?.value === undefined) {
      return;
    }

    const custom = customOptions?.map(option => ({
      value: option.value,
    }));
    const selected = custom?.find(c => c.value === option.value);
    if (onPrintCustom) {
      selected?.value ? onPrintCustom(e) : '';
    }

    const report: ReportRowFragment | undefined = data?.nodes.find(
      r => r.id === option.value
    );
    if (report) {
      report?.argumentSchema ?? setReportWithArgs(report);

      // passing timezone through as forms do not have arguments
      const timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
      onPrint(report, { timezone, ...extraArguments });
    }
  };

  const options: SplitButtonOption<string>[] = useMemo(() => {
    const reports = data
      ? data?.nodes?.map(report => ({
          value: report.id,
          label: translateDynamicKey(`report-code.${report.code}`, report.name),
          isDisabled: disabled,
        }))
      : [];

    const allOptions = [customOptions || [], reports];
    return allOptions.flat();
  }, [data, disabled, customOptions]);

  const handleClick = () => {
    const oneReport = options.length === 1 ? options[0] : undefined;
    if (oneReport) {
      onReportSelected(oneReport);
    }
  };

  const hasPermission = !initialLoading && data !== undefined;
  const noReports: SplitButtonOption<string> = useMemo(() => {
    const noReport = hasPermission
      ? { label: t('error.no-reports-available') }
      : { label: t('error.no-report-permission') };
    return noReport;
  }, [hasPermission]);

  if (options.length === 0) options.push(noReports);

  // updates disabled state
  useEffect(() => {
    setSelectedOption(options[0] || noReports);
  }, [options, noReports]);

  // selected option is at [0] for the SplitButton, however the customLabel is rendered instead
  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<string>
  >(options[0] || noReports);

  const [reportWithArgs, setReportWithArgs] = useState<
    ReportRowFragment | undefined
  >();

  const onSelectOption = (
    option: SplitButtonOption<string>,
    e?: React.MouseEvent<HTMLButtonElement>
  ) => {
    setSelectedOption(option);
    onReportSelected(option, e);
  };

  return (
    <>
      <SplitButton
        color="primary"
        openFrom={'bottom'}
        isDisabled={initialLoading || disabled}
        options={options}
        selectedOption={selectedOption}
        onSelectOption={onSelectOption}
        Icon={<PrinterIcon />}
        onClick={handleClick}
        isLoading={isPrinting}
        isLoadingType={true}
        staticLabel={buttonLabel}
      />
      <ReportArgumentsModal
        key={reportWithArgs?.id}
        report={reportWithArgs}
        onReset={() => setReportWithArgs(undefined)}
        onArgumentsSelected={onPrint}
      />
    </>
  );
};
