import React from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useDetailPanel,
  useUrlQueryParams,
  usePluginProvider,
  useAuthContext,
  ReportContext,
} from '@openmsupply-client/common';
import { useInbound } from '../api';
import { ReportSelector } from '@openmsupply-client/system';
import { AddButton } from './AddButton';
import { AddFromScannerButton } from '../../OutboundShipment/DetailView/AddFromScannerButton';
import { ScannedBarcode } from '../../types';

interface AppBarButtonProps {
  onAddItem: (scannedBarcode?: ScannedBarcode) => void;
  simplifiedTabletView?: boolean;
}

export const AppBarButtonsComponent = ({
  onAddItem,
  simplifiedTabletView,
}: AppBarButtonProps) => {
  const { store } = useAuthContext();
  const isDisabled = useInbound.utils.isDisabled();
  const { data } = useInbound.document.get();
  const { OpenButton } = useDetailPanel();
  const {
    queryParams: { sortBy },
  } = useUrlQueryParams();
  const { plugins } = usePluginProvider();
  const disableInternalOrderButton =
    !store?.preferences.manuallyLinkInternalOrderToInboundShipment ||
    !!data?.linkedShipment ||
    !data?.requisition;

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
        <AddFromScannerButton onAddItem={onAddItem} disabled={isDisabled} />
        {data && (
          <>
            {plugins.inboundShipmentAppBar?.map((Plugin, index) => (
              <Plugin key={index} shipment={data} />
            ))}
            <ReportSelector
              context={ReportContext.InboundShipment}
              dataId={data.id}
              sort={{ key: sortBy.key, desc: sortBy.isDesc }}
            />
          </>
        )}
        {!simplifiedTabletView && OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
