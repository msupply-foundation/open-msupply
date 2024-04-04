import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
  LoadingButton,
  // ReportContext,
  PrinterIcon,
  useUrlQueryParams,
  ReportContext,
} from '@openmsupply-client/common';
import { useReturns } from '../api';
import {
  useReport,
  ReportRowFragment,
  ReportSelector,
} from '@openmsupply-client/system';
import { JsonData } from '@openmsupply-client/programs';

interface AppBarButtonProps {
  onAddItem: () => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
}) => {
  const isDisabled = useReturns.utils.inboundIsDisabled();
  const { data } = useReturns.document.inboundReturn();
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
          onClick={() => onAddItem()}
        />
        <ReportSelector
          context={ReportContext.InboundReturn}
          onPrint={printReport}
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
