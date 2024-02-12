import React, { FC } from 'react';
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
} from '@openmsupply-client/common';
import { StocktakeFragment, useStocktake } from '../api';
import {
  ReportRowFragment,
  ReportSelector,
  useReport,
} from '@openmsupply-client/system';
import { JsonData } from '@openmsupply-client/programs';

interface AppBarButtonProps {
  onAddItem: (newState: boolean) => void;
  stocktake: StocktakeFragment | undefined;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
  stocktake,
}) => {
  const isDisabled = useStocktake.utils.isDisabled();
  const { OpenButton } = useDetailPanel();
  const t = useTranslation('common');
  const { print, isPrinting } = useReport.utils.print();

  const {
    queryParams: { sortBy },
  } = useUrlQueryParams();

  const printReport = (
    report: ReportRowFragment,
    args: JsonData | undefined
  ) => {
    if (!stocktake) return;
    print({
      reportId: report.id,
      dataId: stocktake?.id,
      args,
      sort: { key: sortBy.key, desc: sortBy.isDesc },
    });
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={isDisabled}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={() => onAddItem(true)}
        />
        <ReportSelector context={ReportContext.Stocktake} onPrint={printReport}>
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
