import React, { FC, useEffect } from 'react';
import {
  Checkbox,
  Grid,
  DateUtils,
  Formatter,
  TextWithLabelRow,
  BasicTextInput,
  CurrencyInput,
  ExpiryDateInput,
  useTranslation,
  Box,
  IconButton,
  ScanIcon,
  useBarcodeScannerContext,
  CircularProgress,
  useNotification,
  Tooltip,
  useDebounceCallback,
} from '@openmsupply-client/common';
import { StockLineRowFragment } from '../api';
import { LocationSearchInput } from '../../Location/Components/LocationSearchInput';
import { usePackVariant } from '../..';
import { StyledInputRow } from './StyledInputRow';

interface StockLineFormProps {
  draft: StockLineRowFragment;
  onUpdate: (patch: Partial<StockLineRowFragment>) => void;
  plugins?: JSX.Element[];
}
export const StockLineForm: FC<StockLineFormProps> = ({
  draft,
  onUpdate,
  plugins,
}) => {
  const t = useTranslation('inventory');
  const { error } = useNotification();
  const { isConnected, isEnabled, isScanning, startScan } =
    useBarcodeScannerContext();
  const supplierName = draft.supplierName
    ? draft.supplierName
    : t('message.no-supplier');
  const location = draft?.location ?? null;
  const { asPackVariant } = usePackVariant(
    draft.itemId,
    draft.item.unitName ?? null
  );
  const packUnit = asPackVariant(draft.packSize);

  const scanBarcode = async () => {
    try {
      const result = await startScan();
      if (!!result.content) {
        const { batch, content, expiryDate, gtin } = result;
        const barcode = gtin ?? content;
        const draft = {
          barcode,
          batch,
          expiryDate,
        };

        onUpdate(draft);
      }
    } catch (e) {
      error(t('error.unable-to-scan', { error: e }))();
    }
  };

  const debouncedUpdate = useDebounceCallback(
    (patch: Partial<StockLineRowFragment>) => onUpdate(patch),
    [onUpdate],
    500
  );

  useEffect(() => {
    function handleKeyDown(this: HTMLElement, ev: KeyboardEvent) {
      if (ev.ctrlKey && ev.key === 's') {
        scanBarcode();
      }
    }
    document.body.addEventListener('keydown', handleKeyDown);
    return () => document.body.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Grid
      display="flex"
      flex={1}
      container
      paddingTop={2}
      paddingBottom={2}
      width="100%"
    >
      <Grid
        container
        display="flex"
        flex={1}
        flexBasis="50%"
        flexDirection="column"
        gap={1}
      >
        <TextWithLabelRow
          label={t('label.num-packs')}
          text={String(draft.totalNumberOfPacks)}
          textProps={{ textAlign: 'end' }}
        />
        <StyledInputRow
          label={t('label.cost-price')}
          Input={
            <CurrencyInput
              autoFocus
              defaultValue={draft.costPricePerPack}
              onChangeNumber={costPricePerPack =>
                debouncedUpdate({ costPricePerPack })
              }
            />
          }
        />
        <StyledInputRow
          label={t('label.sell-price')}
          Input={
            <CurrencyInput
              defaultValue={draft.sellPricePerPack}
              onChangeNumber={sellPricePerPack =>
                debouncedUpdate({ sellPricePerPack })
              }
            />
          }
        />
        <StyledInputRow
          label={t('label.expiry')}
          Input={
            <ExpiryDateInput
              value={DateUtils.getDateOrNull(draft.expiryDate)}
              onChange={date =>
                onUpdate({ expiryDate: Formatter.naiveDate(date) })
              }
            />
          }
        />
        <StyledInputRow
          label={t('label.batch')}
          Input={
            <BasicTextInput
              defaultValue={draft.batch ?? ''}
              onChange={e => debouncedUpdate({ batch: e.target.value })}
            />
          }
        />
        {plugins}
      </Grid>
      <Grid
        container
        display="flex"
        flex={1}
        flexBasis="50%"
        flexDirection="column"
        gap={1}
      >
        <TextWithLabelRow
          label={t('label.pack')}
          text={String(packUnit)}
          textProps={{ textAlign: 'end' }}
        />
        <StyledInputRow
          label={t('label.on-hold')}
          Input={
            <Checkbox
              checked={draft.onHold}
              onChange={(_, onHold) => onUpdate({ onHold })}
            />
          }
        />
        <StyledInputRow
          label={t('label.location')}
          Input={
            <LocationSearchInput
              autoFocus={false}
              disabled={false}
              selectedLocation={location}
              width={160}
              onChange={location => {
                onUpdate({ location, locationId: location?.id });
              }}
            />
          }
        />
        <StyledInputRow
          label={t('label.barcode')}
          Input={
            <Box display="flex" style={{ width: 162 }}>
              <BasicTextInput
                defaultValue={draft.barcode ?? ''}
                onChange={e => debouncedUpdate({ barcode: e.target.value })}
              />
              {isEnabled && (
                <Tooltip
                  title={isConnected ? '' : t('error.scanner-not-connected')}
                >
                  <Box>
                    <IconButton
                      disabled={isScanning || !isConnected}
                      onClick={scanBarcode}
                      icon={
                        isScanning ? (
                          <CircularProgress size={20} color="secondary" />
                        ) : (
                          <ScanIcon />
                        )
                      }
                      label={t('button.scan')}
                    />
                  </Box>
                </Tooltip>
              )}
            </Box>
          }
        />
        <TextWithLabelRow
          label={t('label.supplier')}
          text={String(supplierName)}
          textProps={{ textAlign: 'end' }}
        />
      </Grid>
    </Grid>
  );
};
