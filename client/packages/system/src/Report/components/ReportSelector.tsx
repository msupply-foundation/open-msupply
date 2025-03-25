import React, { FC, PropsWithChildren, useMemo, useState } from 'react';
import { ReportContext, useTranslation } from '@openmsupply-client/common';
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
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
interface ReportSelectorProps {
  context?: ReportContext;
  subContext?: string;
  onPrint: (report: ReportRowFragment, args: JsonData | undefined) => void;
  isPrinting?: boolean;
  /** Disable the whole control */
  disabled?: boolean;
  queryParams?: ReportListParams;
  extraOptions?: CustomOption<string>[];
  onPrintCustom?: (
    e: React.MouseEvent<HTMLButtonElement>,
    option: string
  ) => void;
  buttonLabel?: string;
}

export const ReportSelector: FC<PropsWithChildren<ReportSelectorProps>> = ({
  context,
  subContext,
  onPrint,
  isPrinting,
  disabled,
  queryParams,
  extraOptions,
  onPrintCustom,
  buttonLabel,
}) => {
  const { data, isLoading: initialLoading } = useReportList({
    context,
    subContext,
    queryParams,
  });
  const t = useTranslation();

  // Report Content
  const onReportSelected = (
    option: SplitButtonOption<string> | undefined,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    if (option?.value === undefined) {
      return;
    }

    // // if there is a matching custom option
    const actions = extraOptions?.map(opt => ({
      value: opt.value,
    }));
    const act = actions?.find(a => a.value === option.value);
    if (onPrintCustom) {
      act?.value ? onPrintCustom(e, act.value) : '';
    }

    // if not custom, find report data from option id
    const report: ReportRowFragment | undefined = data?.nodes.find(
      r => r.id === option.value
    );
    if (report) {
      // report with args
      report?.argumentSchema ?? setReportWithArgs(report);

      // report without args
      // passing timezone through as forms do not have arguments
      const timezone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
      onPrint(report, { timezone });
    }
  };

  // button options renderer - if exist
  const options: SplitButtonOption<string>[] = useMemo(() => {
    const reports = data
      ? data?.nodes?.map(report => ({
          value: report.id,
          label: report.name,
          isDisabled: disabled ? true : false,
        }))
      : [];

    const allOptions = [extraOptions || [], reports];
    return allOptions.flat();
  }, [data, disabled, extraOptions]);

  // for if no options
  const hasPermission = !initialLoading && data !== undefined;
  const noReports = hasPermission
    ? { label: t('error.no-reports-available') }
    : { label: t('error.no-report-permission') };
  // the selected option
  const [selectedOption, setSelectedOption] = useState<
    SplitButtonOption<string>
  >(options[0] || noReports);

  // selected with args
  const [reportWithArgs, setReportWithArgs] = useState<
    ReportRowFragment | undefined
  >();

  const onSelectOption = (
    option: SplitButtonOption<string>,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    setSelectedOption(option);
    onReportSelected(option, e);
  };

  return (
    <>
      <SplitButton
        color="primary"
        openFrom={'bottom'}
        isDisabled={initialLoading}
        options={options}
        selectedOption={selectedOption}
        onSelectOption={onSelectOption} // click with change
        Icon={<PrinterIcon />}
        onClick={() => {}} // click without changing option
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
