import {
  ArrowRightIcon,
  Box,
  Divider,
  InputWithLabelRow,
  NumericTextInput,
  TextWithLabelRow,
  useTranslation,
  RepackNode,
} from '@openmsupply-client/common';
import {
  LocationRowFragment,
  Repack,
  StockLineFragment,
} from '@openmsupply-client/system';
import { LocationSearchInput } from '../../..';
import React, { FC, useEffect, useState } from 'react';

const INPUT_WIDTH = 100;

interface RepackEditFormProps {
  stockLine: StockLineFragment | null;
  onChange: (repack: Repack) => void;
  draft: Repack;
  repackData?: RepackNode;
}

export const RepackEditForm: FC<RepackEditFormProps> = ({
  onChange,
  stockLine,
  draft,
  repackData,
}) => {
  const t = useTranslation('inventory');
  const [location, setLocation] = useState<LocationRowFragment | null>(null);
  const { availableNumberOfPacks = 0 } = stockLine ?? {};
  const textProps = { textAlign: 'end' as 'end' | 'start', paddingRight: 3 };
  const labelProps = { sx: { width: 0 } };
  const isNew = !repackData;

  useEffect(() => {
    setLocation(null);
  }, [repackData]);

  return (
    <Box justifyContent="center">
      <Divider />
      <Box display="flex">
        <Box display="flex" flexDirection="column" padding={2} gap={1} flex={1}>
          {isNew && (
            <TextWithLabelRow
              label={t('label.packs-available')}
              text={String(availableNumberOfPacks)}
              textProps={textProps}
              labelProps={labelProps}
            />
          )}
          <InputWithLabelRow
            label={t('label.packs-to-repack')}
            labelWidth="100%"
            Input={
              <NumericTextInput
                autoFocus
                onChange={numberOfPacks =>
                  onChange({
                    numberOfPacks,
                  })
                }
                width={INPUT_WIDTH}
                value={
                  isNew
                    ? draft.numberOfPacks
                    : repackData?.from.numberOfPacks ?? 0
                }
                max={availableNumberOfPacks}
                disabled={!isNew}
              />
            }
          />
          <TextWithLabelRow
            label={t('label.pack-size')}
            text={
              isNew
                ? String(stockLine?.packSize ?? '')
                : String(repackData?.from.packSize ?? '')
            }
            textProps={textProps}
            labelProps={labelProps}
          />
          <TextWithLabelRow
            label={t('label.location')}
            text={
              isNew
                ? String(stockLine?.location?.name ?? '-')
                : String(repackData?.to.location?.name ?? '-')
            }
            textProps={textProps}
            labelProps={labelProps}
          />
        </Box>
        <Box
          alignItems="center"
          display="flex"
          paddingLeft={2}
          paddingRight={6}
        >
          <ArrowRightIcon color="primary" />
        </Box>
        <Box
          display="flex"
          flexDirection="column"
          gap={1}
          paddingTop={2}
          flex={1}
        >
          {isNew && <Box height={24} />}
          <TextWithLabelRow
            label={t('label.new-num-packs')}
            text={
              isNew
                ? (
                    ((draft.numberOfPacks ?? 0) * (stockLine?.packSize ?? 0)) /
                    (draft.newPackSize || 1)
                  ).toFixed(2)
                : String(repackData?.to.numberOfPacks ?? '')
            }
            textProps={textProps}
            labelProps={labelProps}
          />
          <InputWithLabelRow
            label={t('label.new-pack-size')}
            labelWidth="100%"
            Input={
              <NumericTextInput
                onChange={newPackSize =>
                  onChange({
                    newPackSize,
                  })
                }
                width={INPUT_WIDTH}
                value={isNew ? draft.newPackSize : repackData?.to.packSize ?? 0}
                disabled={!isNew}
              />
            }
          />
          <InputWithLabelRow
            label={t('label.new-location')}
            labelWidth="100%"
            Input={
              <LocationSearchInput
                autoFocus={false}
                disabled={!isNew}
                selectedLocation={location}
                width={160}
                onChange={location => {
                  setLocation(location);
                  onChange({
                    newLocationId: location?.id,
                  });
                }}
              />
            }
          />
        </Box>
      </Box>
    </Box>
  );
};
