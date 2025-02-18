import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useDetailPanel,
  useTranslation,
  PrinterIcon,
  ReportContext,
  LoadingButton,
  useUrlQueryParams,
  usePluginElements,
  useAuthContext,
} from '@openmsupply-client/common';
import { useInbound } from '../api';
import {
  ReportSelector,
  ReportRowFragment,
  usePrintReport,
} from '@openmsupply-client/system';
import { JsonData } from '@openmsupply-client/programs';
import { AddButton } from './AddButton';

interface AppBarButtonProps {
  onAddItem: (newState: boolean) => void;
}

export const AppBarButtonsComponent = ({ onAddItem }: AppBarButtonProps) => {
  const t = useTranslation();
  const { store } = useAuthContext();
  const isDisabled = useInbound.utils.isDisabled();
  const { data } = useInbound.document.get();
  const { OpenButton } = useDetailPanel();
  const { print, isPrinting } = usePrintReport();
  const {
    queryParams: { sortBy },
  } = useUrlQueryParams();
  const pluginButtons = usePluginElements({
    type: 'InboundShipmentAppBar',
    data,
  });
  const disableInternalOrderButton =
    !store?.preferences.manuallyLinkInternalOrderToInboundShipment ||
    !!data?.linkedShipment ||
    !data?.requisition;

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
        <AddButton
          onAddItem={onAddItem}
          requisitionId={data?.requisition?.id ?? ''}
          invoiceId={data?.id ?? ''}
          disable={isDisabled}
          disableAddFromMasterListButton={!!data?.linkedShipment}
          disableAddFromInternalOrderButton={disableInternalOrderButton}
        />
        {pluginButtons}
        <ReportSelector
          context={ReportContext.InboundShipment}
          onPrint={printReport}
        >
          <LoadingButton
            variant="outlined"
            startIcon={<PrinterIcon />}
            isLoading={isPrinting}
            label={t('button.print')}
          />
        </ReportSelector>

        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
