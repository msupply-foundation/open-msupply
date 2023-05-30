import {
  Box,
  InputWithLabelRow,
  PositiveNumberInput,
  TextWithLabelRow,
  useTranslation,
} from '@openmsupply-client/common';
import {
  LocationRowFragment,
  Repack,
  StockLineFragment,
  useStock,
} from '@openmsupply-client/system';
import { LocationSearchInput } from 'packages/system/src/Location/Components/LocationSearchInput';
import React, { FC, useState } from 'react';

interface RepackEditFormProps {
  invoiceId?: string;
  repackId: string | undefined;
  stockLine: StockLineFragment | null;
  onInsert: (repack: Repack) => void;
}

export const RepackEditForm: FC<RepackEditFormProps> = ({
  invoiceId,
  repackId,
  onInsert,
  stockLine,
}) => {
  const t = useTranslation('inventory');
  const { data } = useStock.repack.get(invoiceId ?? '');
  const [location, setLocation] = useState<LocationRowFragment | null>(null);

  return (
    <Box display="flex" flexDirection="column" padding={2} gap={1}>
      <TextWithLabelRow
        label={t('label.pack-size')}
        text={
          invoiceId
            ? String(data?.to.packSize ?? '')
            : String(stockLine?.packSize ?? '')
        }
        textProps={{ textAlign: 'end' }}
        labelProps={{ sx: { width: 0 } }}
      />
      <TextWithLabelRow
        label={t('label.num-packs')}
        text={
          invoiceId
            ? String(data?.to.numberOfPacks ?? '')
            : String(stockLine?.totalNumberOfPacks ?? '')
        }
        textProps={{ textAlign: 'end' }}
        labelProps={{ sx: { width: 0 } }}
      />
      <TextWithLabelRow
        label={t('label.location')}
        text={
          invoiceId
            ? String(data?.to.location?.name ?? '')
            : String(stockLine?.location?.name ?? '')
        }
        textProps={{ textAlign: 'end' }}
        labelProps={{ sx: { width: 0 } }}
      />
      <Box display="flex" flexDirection="column" gap={1} paddingTop={2}>
        <InputWithLabelRow
          label={t('label.new-pack-size')}
          Input={
            <PositiveNumberInput
              onChange={newPackSize => {
                onInsert({
                  stockLineId: invoiceId ? repackId : stockLine?.id,
                  newPackSize,
                });
              }}
              width={143}
              disabled={!!invoiceId}
            />
          }
        />
        <InputWithLabelRow
          label={t('label.new-num-packs')}
          Input={
            <PositiveNumberInput
              onChange={numberOfPacks => {
                onInsert({
                  stockLineId: invoiceId ? repackId : stockLine?.id,
                  numberOfPacks,
                });
              }}
              width={143}
              disabled={!!invoiceId}
            />
          }
        />
        <InputWithLabelRow
          label={t('label.new-location')}
          Input={
            <LocationSearchInput
              autoFocus={false}
              disabled={!!invoiceId}
              value={location}
              width={160}
              onChange={location => {
                setLocation(location);
                onInsert({
                  stockLineId: invoiceId ? repackId : stockLine?.id,
                  newLocationId: location?.id,
                });
              }}
            />
          }
        />
        <Box display="flex" flexDirection="column" gap={1} paddingTop={3}>
          <TextWithLabelRow
            label={t('label.remainder-pack-size')}
            text={
              invoiceId
                ? String(data?.from.packSize ?? '')
                : String(stockLine?.packSize ?? '')
            }
            textProps={{ textAlign: 'end' }}
          />
          {invoiceId && (
            <TextWithLabelRow
              label={t('label.remainder-location')}
              text={String(data?.from.location?.name ?? '')}
              textProps={{ textAlign: 'end' }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};
