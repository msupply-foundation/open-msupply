import React, { useCallback } from 'react';
import {
  AppBarButtonsPortal,
  ButtonWithIcon,
  PlusCircleIcon,
  Grid,
  useDetailPanel,
  useTranslation,
  ReportContext,
  useUrlQueryParams,
  ScanResult,
  useNotification,
} from '@openmsupply-client/common';
import { useOutbound } from '../api';
import { ReportSelector } from '@openmsupply-client/system';
import { AddFromMasterListButton } from './AddFromMasterListButton';
import { AddFromScannerButton } from './AddFromScannerButton';
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
      if (!!result.content) {
        const { content, gtin, batch, expiryDate } = result;
        const value = gtin ?? content;
        const barcode = await getBarcode(value);

        // Barcode exists
        if (barcode?.__typename === 'BarcodeNode') {
          onAddItem({ ...barcode, batch, expiryDate: expiryDate ?? undefined });
        } else {
          warning(t('error.no-matching-item'))();

          onAddItem({
            gtin: value,
            batch,
            expiryDate: expiryDate ?? undefined,
          });
        }
      }
    },
    [getBarcode, onAddItem, warning, t]
  );

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
        <AddFromScannerButton
          handleScanResult={handleScanResult}
          disabled={isDisabled}
        />
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
