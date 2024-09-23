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
import { useStocktake } from '../api';
import { ReportSelector, usePrintReport } from '@openmsupply-client/system';
import { JsonData } from '@openmsupply-client/programs';
import { isStocktakeDisabled } from '../../utils';
import { ReportRowFragment } from '@openmsupply-client/system';

interface AppBarButtonProps {
  onAddItem: (newState: boolean) => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
}) => {
  const { OpenButton } = useDetailPanel();
  const t = useTranslation(); // note: using 'reports' due to issue #4616
  const { print, isPrinting } = usePrintReport();
  const { data } = useStocktake.document.get();
  const isDisabled = !data || isStocktakeDisabled(data);

  const {
    queryParams: { sortBy },
  } = useUrlQueryParams();

  const printReport = (
    report: ReportRowFragment,
    args: JsonData | undefined
  ) => {
    if (!data) return;
    print({
      reportId: report.id,
      dataId: data?.id,
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
