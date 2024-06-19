import {
  ArrowRightIcon,
  Box,
  Divider,
  InputWithLabelRow,
  NumericTextInput,
  TextWithLabelRow,
  useTranslation,
} from '@openmsupply-client/common';
import { LocationRowFragment, RepackDraft } from '@openmsupply-client/system';
import { LocationSearchInput } from '../../..';
import React, { FC, useState } from 'react';

const INPUT_WIDTH = 100;

interface RepackEditFormProps {
  onChange: (repack: Partial<RepackDraft>) => void;
  data: RepackDraft;
  isNew: boolean;
  availableNumberOfPacks: number;
}

export const RepackEditForm: FC<RepackEditFormProps> = ({
  onChange,
  data,
  isNew,
  availableNumberOfPacks,
}) => {
  const t = useTranslation('inventory');
  const [location, setLocation] = useState<LocationRowFragment | null>(null);
  const textProps = { textAlign: 'end' as 'end' | 'start', paddingRight: 3 };
  const labelProps = { sx: { width: 0 } };

  return (
    <Box justifyContent="center">
      <Divider />
      <Box display="flex">
        <Box display="flex" flexDirection="column" padding={2} gap={1} flex={1}>
          {isNew && (
            <TextWithLabelRow
              label={t('label.packs-available')}
              text={String(availableNumberOfPacks ?? '')}
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
                value={data.numberOfPacks}
                max={availableNumberOfPacks}
                disabled={!isNew}
              />
            }
          />
          <TextWithLabelRow
            label={t('label.pack-size')}
            text={String(data.packSize ?? '')}
            textProps={textProps}
            labelProps={labelProps}
          />
          <TextWithLabelRow
            label={t('label.location')}
            text={data?.locationName ?? '-'}
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
            text={(
              ((data.numberOfPacks ?? 0) * (data?.packSize ?? 0)) /
              (data.newPackSize || 1)
            ).toFixed(2)}
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
                value={data.newPackSize}
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
