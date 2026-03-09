import React from 'react';
import {
  AppBarButtonsPortal,
  AddFromScannerButton,
  Grid,
  useDetailPanel,
  useUrlQueryParams,
  usePluginProvider,
  useAuthContext,
  ReportContext,
  useNotification,
  useIsExtraSmallScreen,
} from '@openmsupply-client/common';
import { useInboundShipment } from '../api';
import { ReportSelector } from '@openmsupply-client/system';
import { AddButton } from './AddButton';
import { ScannedBarcode } from '../../types';

interface AppBarButtonProps {
  onAddItem: (scannedBarcode?: ScannedBarcode) => void;
  openUploadModal: () => void;
  simplifiedTabletView?: boolean;
}

export const AppBarButtonsComponent = ({
  onAddItem,
  openUploadModal,
  simplifiedTabletView,
}: AppBarButtonProps) => {
  const { store } = useAuthContext();
  const {
    query: { data },
    isDisabled,
  } = useInboundShipment();
  const { OpenButton } = useDetailPanel();
  const {
    queryParams: { sortBy },
  } = useUrlQueryParams();
  const { plugins } = usePluginProvider();
  const {} = useNotification();

  const isExtraSmallScreen = useIsExtraSmallScreen();

  if (isExtraSmallScreen) {
    // On mobile, we don't have mobile ui for line by line editing or reports
    // We just want to show the scan button for mobile users to use the scanner approach.
    return (
      <AppBarButtonsPortal>
        <AddFromScannerButton disabled={isDisabled} />
      </AppBarButtonsPortal>
    );
  }

  const disableInternalOrderButton =
    !store?.preferences.manuallyLinkInternalOrderToInboundShipment ||
    !!data?.linkedShipment ||
    !data?.requisition;

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <AddButton
          onAddItem={onAddItem}
          openUploadModal={openUploadModal}
          requisitionId={data?.requisition?.id ?? ''}
          invoice={data}
          disable={isDisabled}
          disableAddFromMasterListButton={!!data?.linkedShipment || !!data?.purchaseOrder}
          disableAddFromInternalOrderButton={disableInternalOrderButton}
        />
        <AddFromScannerButton disabled={isDisabled} />
        {data && (
          <>
            {plugins.inboundShipmentAppBar?.map((Plugin, index) => (
              <Plugin key={index} shipment={data} />
            )) ?? null}
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
