import React, { FC } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
  LoadingButton,
  ReportContext,
  PrinterIcon,
  useUrlQueryParams,
} from '@openmsupply-client/common';
import { useReturns } from '../api';
import {
  ReportRowFragment,
  ReportSelector,
  usePrintReport,
} from '@openmsupply-client/system';
import { JsonData } from '@openmsupply-client/programs';
import { Draft } from '../..';

interface AppBarButtonProps {
  onAddItem: (draft?: Draft) => void;
}

export const AppBarButtonsComponent: FC<AppBarButtonProps> = ({
  onAddItem,
}) => {
  const isDisabled = useReturns.utils.supplierIsDisabled();
  const { data } = useReturns.document.supplierReturn();
  const { OpenButton } = useDetailPanel();
  const t = useTranslation('common');
  const { print, isPrinting } = usePrintReport();
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
          context={ReportContext.OutboundShipment}
          subContext="SupplierReturn"
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
