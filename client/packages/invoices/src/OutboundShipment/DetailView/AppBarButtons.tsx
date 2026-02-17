/* eslint-disable no-console */
import React, { useCallback, useEffect } from 'react';
import {
  AppBarButtonsPortal,
  AddFromScannerButton,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
  ReportContext,
  useUrlQueryParams,
  ScanResult,
  useNotification,
  useBarcodeScannerContext,
} from '@openmsupply-client/common';
import { useOutbound } from '../api';
import { ReportSelector } from '@openmsupply-client/system';
import { AddFromMasterListButton } from './AddFromMasterListButton';
import { ScannedBarcode } from '../../types';

interface AppBarButtonProps {
  onAddItem: (scanned?: ScannedBarcode) => void;
}

export const AppBarButtonsComponent = ({ onAddItem }: AppBarButtonProps) => {
  const isDisabled = useOutbound.utils.isDisabled();
  const { data } = useOutbound.document.get();
  const { mutateAsync: getBarcode } = useOutbound.utils.barcode();
  const { OpenButton } = useDetailPanel();
  const t = useTranslation();
  const {
    queryParams: { sortBy },
  } = useUrlQueryParams();

  const { warning } = useNotification();

  const handleScanResult = useCallback(
    async (result: ScanResult) => {
      console.log(
        '📢 OutboundShipment AppBarButtons: handleScanResult called with:',
        result
      );

      if (!!result.content) {
        const { content, gtin, batch, expiryDate } = result;
        const value = gtin ?? content;
        console.log('📢 OutboundShipment: Looking up barcode:', value);

        const barcode = await getBarcode(value);
        console.log('📢 OutboundShipment: Barcode lookup result:', barcode);

        // Barcode exists
        if (barcode?.__typename === 'BarcodeNode') {
          console.log(
            '📢 OutboundShipment: Found existing barcode, calling onAddItem'
          );
          onAddItem({ ...barcode, batch, expiryDate: expiryDate ?? undefined });
        } else {
          console.log('📢 OutboundShipment: No matching item found');
          warning(t('error.no-matching-item'))();

          onAddItem({
            gtin: value,
            batch,
            expiryDate: expiryDate ?? undefined,
          });
        }
      } else {
        console.log('📢 OutboundShipment: No content in scan result');
      }
    },
    [getBarcode, onAddItem, warning, t]
  );

  console.log(
    '📢 OutboundShipment AppBarButtons: Registering handleScanResult callback'
  );

  const { registerCallback } = useBarcodeScannerContext();

  useEffect(() => {
    console.log(
      '📢 OutboundShipment AppBarButtons: Registering handleScanResult callback via useEffect'
    );
    registerCallback(handleScanResult);
  }, [registerCallback, handleScanResult]);

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={isDisabled}
          label={t('button.add-item')}
          Icon={<PlusCircleIcon />}
          onClick={() => onAddItem()}
        />
        <AddFromMasterListButton />
        <AddFromScannerButton disabled={isDisabled} />
        <ReportSelector
          context={ReportContext.OutboundShipment}
          dataId={data?.id ?? ''}
          sort={{ key: sortBy.key, desc: sortBy.isDesc }}
        />
        {OpenButton}
      </Grid>
    </AppBarButtonsPortal>
  );
};

export const AppBarButtons = React.memo(AppBarButtonsComponent);
