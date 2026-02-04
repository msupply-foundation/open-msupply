import React, { useCallback } from 'react';
import {
  AppBarButtonsPortal,
  Grid,
  useDetailPanel,
  useUrlQueryParams,
  usePluginProvider,
  useAuthContext,
  ReportContext,
  ScanResult,
  useTranslation,
  useNotification,
} from '@openmsupply-client/common';
import { useInbound } from '../api';
import { ReportSelector } from '@openmsupply-client/system';
import { AddButton } from './AddButton';
import { ScannedBarcode } from '../../types';
import { AddFromScannerButton } from '../../OutboundShipment/DetailView/AddFromScannerButton';
import { useOutbound } from '../../OutboundShipment/api';

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
  const t = useTranslation();
  const { mutateAsync: getBarcode } = useOutbound.utils.barcode();
  const { store } = useAuthContext();
  const isDisabled = useInbound.utils.isDisabled();
  const { data } = useInbound.document.get();
  const { OpenButton } = useDetailPanel();
  const {
    queryParams: { sortBy },
  } = useUrlQueryParams();
  const { plugins } = usePluginProvider();
  const { warning } = useNotification();

  const disableInternalOrderButton =
    !store?.preferences.manuallyLinkInternalOrderToInboundShipment ||
    !!data?.linkedShipment ||
    !data?.requisition;

  // const handleScanResult = useCallback(
  //   async (result: ScanResult) => {
  //     if (!!result.content) {
  //       const { content, gtin, batch, expiryDate } = result;
  //       const value = gtin ?? content;
  //       const barcode = await getBarcode(value);

  //       // Barcode exists
  //       if (barcode?.__typename === 'BarcodeNode') {
  //         onAddItem({ ...barcode, batch, expiryDate: expiryDate ?? undefined });
  //       } else {
  //         warning(t('error.no-matching-item'))();

  //         onAddItem({
  //           gtin: value,
  //           batch,
  //           expiryDate: expiryDate ?? undefined,
  //         });
  //       }
  //     }
  //   },
  //   [getBarcode, onAddItem, warning, t]
  // );

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <AddButton
          onAddItem={onAddItem}
          openUploadModal={openUploadModal}
          requisitionId={data?.requisition?.id ?? ''}
          invoice={data}
          disable={isDisabled}
          disableAddFromMasterListButton={!!data?.linkedShipment}
          disableAddFromInternalOrderButton={disableInternalOrderButton}
        />
        <AddFromScannerButton
          // Actual method added in "ScanInputModal" component
          handleScanResult={async result => {
            console.log('RESULT', result);
          }}
          disabled={isDisabled}
        />
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
