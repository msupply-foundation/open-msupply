import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useDetailPanel,
  useUrlQueryParams,
  usePluginProvider,
  useAuthContext,
  ReportContext,
  useTranslation,
} from '@openmsupply-client/common';
import { useInbound } from '../api';
import {
  ReportRowFragment,
  ReportSelector,
  usePrintReport,
} from '@openmsupply-client/system';
import { JsonData } from '@openmsupply-client/programs';
import { AddButton } from './AddButton';

interface AppBarButtonProps {
  onAddItem: (newState: boolean) => void;
  simplifiedTabletView?: boolean;
}

export const AppBarButtonsComponent = ({
  onAddItem,
  simplifiedTabletView,
}: AppBarButtonProps) => {
  const t = useTranslation();
  const { store } = useAuthContext();
  const isDisabled = useInbound.utils.isDisabled();
  const { data } = useInbound.document.get();
  const { OpenButton } = useDetailPanel();
  const { print, isPrinting } = usePrintReport();
  const {
    queryParams: { sortBy },
  } = useUrlQueryParams();
  const { plugins } = usePluginProvider();
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
          invoice={data}
          disable={isDisabled}
          disableAddFromMasterListButton={!!data?.linkedShipment}
          disableAddFromInternalOrderButton={disableInternalOrderButton}
        />
        {data &&
          plugins.inboundShipmentAppBar?.map((Plugin, index) => (
            <Plugin key={index} shipment={data} />
          ))}
        <ReportSelector
          context={ReportContext.InboundShipment}
          onPrint={printReport}
          isPrinting={isPrinting}
          buttonLabel={t('button.print')}
        />
        {!simplifiedTabletView && OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
