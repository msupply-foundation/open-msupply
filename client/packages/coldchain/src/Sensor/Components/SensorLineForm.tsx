import React, { FC } from 'react';
import { LocationSearchInput } from '@openmsupply-client/system/src';
import { useTranslation } from '@common/intl';
import { BasicTextInput, InputWithLabelRow } from '@common/components';
import {
  Box,
  Formatter,
  TextWithLabelRow,
  SensorNodeType,
  UNDEFINED_STRING_VALUE,
} from '@openmsupply-client/common';
import { UseDraftSensorControl } from './SensorEditModal';
import { isSensorNameEditDisabled } from '../utils';
import { useFormatTemperature } from '../../common';

export const SensorLineForm: FC<UseDraftSensorControl> = ({
  draft,
  onUpdate,
}) => {
  const t = useTranslation('coldchain');
  const textSx = { paddingLeft: 2 };
  const labelWrap = { sx: { whiteSpace: 'pre-wrap' } };
  const inputTextAlign = { sx: { textAlign: 'end' } };
  const formatTemperature = useFormatTemperature();

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <InputWithLabelRow
        label={t('label.sensor-name')}
        labelProps={inputTextAlign}
        Input={
          <BasicTextInput
            value={draft.name ?? ''}
            onChange={e => onUpdate({ name: e.target.value })}
            disabled={isSensorNameEditDisabled(draft)}
          />
        }
      />

      <InputWithLabelRow
        label={t('label.location')}
        labelProps={inputTextAlign}
        Input={
          <LocationSearchInput
            autoFocus={false}
            disabled={false}
            selectedLocation={draft.location ?? null}
            width={180}
            onChange={location => {
              onUpdate({ location });
            }}
          />
        }
      />
      <TextWithLabelRow
        sx={textSx}
        label={t('label.cce')}
        text={
          draft.assets?.nodes?.map(a => a.assetNumber).join(', ') ||
          UNDEFINED_STRING_VALUE
        }
      />
      <TextWithLabelRow
        sx={textSx}
        label={t('label.serial')}
        text={draft.serial ?? ''}
      />
      <TextWithLabelRow
        sx={textSx}
        label={t('label.battery-level')}
        text={
          draft.batteryLevel ? `${draft.batteryLevel}%` : UNDEFINED_STRING_VALUE
        }
      />
      <TextWithLabelRow
        sx={textSx}
        labelProps={labelWrap}
        label={t('label.last-reading')}
        text={
          !!draft.latestTemperatureLog?.nodes[0]?.temperature
            ? `${formatTemperature(
                draft.latestTemperatureLog?.nodes[0]?.temperature
              )}`
            : UNDEFINED_STRING_VALUE
        }
      />
      <TextWithLabelRow
        sx={textSx}
        labelProps={labelWrap}
        label={t('label.last-record')}
        text={Formatter.csvDateTimeString(
          draft.latestTemperatureLog?.nodes[0]?.datetime
        )}
      />
      <TextWithLabelRow
        sx={textSx}
        labelProps={labelWrap}
        label={t('label.sensor-type')}
        text={
          draft.type === SensorNodeType.BlueMaestro
            ? t('label.rtmd')
            : Formatter.enumCase(draft?.type)
        }
      />
    </Box>
  );
};
