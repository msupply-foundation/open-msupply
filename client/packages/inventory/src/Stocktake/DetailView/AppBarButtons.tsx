import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
  ReportContext,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useStocktakeOld } from '../api';
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
  const t = useTranslation();
  const { print, isPrinting } = usePrintReport();
  const { data } = useStocktakeOld.document.get();
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
        <ReportSelector
          context={ReportContext.Stocktake}
          onPrint={printReport}
          isPrinting={isPrinting}
          buttonLabel={t('button.print')}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
