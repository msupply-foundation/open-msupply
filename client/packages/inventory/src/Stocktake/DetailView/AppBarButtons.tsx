import React, { FC, useEffect, useState } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
  ReportContext,
  LoadingButton,
  PrinterIcon,
  useUrlQueryParams,
  DataSortInput,
} from '@openmsupply-client/common';
import { useStocktake } from '../api';
import {
  ReportRowFragment,
  ReportSelector,
  useReport,
} from '@openmsupply-client/system';
import { JsonData } from '@openmsupply-client/programs';

interface AppBarButtonProps {
  onAddItem: (newState: boolean) => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
}) => {
  const isDisabled = useStocktake.utils.isDisabled();
  const { OpenButton } = useDetailPanel();
  const t = useTranslation('common');
  const { data } = useStocktake.document.get();
  const { print, isPrinting } = useReport.utils.print();

  const [isReportPrinting, setIsReportPrinting] = useState(false);
  const [report, setReport] = useState<ReportRowFragment>();
  const [args, setArgs] = useState<JsonData>();
  const {
    queryParams: { sortBy },
  } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });

  const printReport = (
    report: ReportRowFragment,
    args: JsonData | undefined,
    sortBy?: DataSortInput
  ) => {
    if (!data) return;
    print({
      reportId: report.id,
      dataId: data?.id,
      args,
      sortBy,
    });
  };

  // Note: The `sortBy` from the `useUrlQueryParams` doesn't seem to be updating
  // when it is used as directly or being passed as an argument to the `printReport` function.
  // It is always the same value as when the component was first rendered,
  // even when the value changes when the user clicks on the table header.
  // It seems to behave as a side effect of the `useUrlQueryParams` hook.
  // So needed to handle it in the `useEffect` below and then update it here.
  useEffect(() => {
    let isMounted = true;
    if (isMounted && isReportPrinting && report) {
      printReport(report, args, { key: sortBy.key, desc: sortBy.isDesc });
      setIsReportPrinting(false);
    }
    return () => {
      isMounted = false;
    };
  }, [isReportPrinting, report, args]);

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={isDisabled}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={() => onAddItem(true)}
        />
        <ReportSelector
          context={ReportContext.Stocktake}
          onPrint={(report, args) => {
            setReport(report);
            setArgs(args);
            setIsReportPrinting(true);
          }}
        >
          <LoadingButton
            variant="outlined"
            startIcon={<PrinterIcon />}
            isLoading={isPrinting}
          >
            {t('button.print')}
          </LoadingButton>
        </ReportSelector>
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
