import React, { FC } from 'react';
import { SensorFragment } from '../api';
import { Grid } from '@mui/material';
import {
  TextWithLabelRow,
  useTranslation,
} from '@openmsupply-client/common/src';

interface NonEditableSensorTabProps {
  draft: SensorFragment;
}

export const NonEditableSensorTab: FC<NonEditableSensorTabProps> = ({
  draft,
}) => {
  const t = useTranslation('coldchain');

  return (
    <Grid container display="flex" flex={1} flexDirection="column" gap={1}>
      <TextWithLabelRow
        label={t('label.cce')}
        labelWidth="140px"
        text={''}
        textProps={{
          textAlign: 'start',
          paddingLeft: '50',
          paddingTop: '4',
          paddingBottom: '4',
        }}
        labelProps={{ sx: { padding: '4', textAlign: 'end' } }}
        sensorStyle={true}
      />
      <TextWithLabelRow
        label={t('label.serial')}
        labelWidth="140px"
        text={draft.serial ?? ''}
        textProps={{
          textAlign: 'start',
          paddingLeft: '50',
          paddingTop: '4',
          paddingBottom: '4',
        }}
        labelProps={{ sx: { padding: '4', textAlign: 'end' } }}
        sensorStyle={true}
      />
      <TextWithLabelRow
        label={t('label.battery-level')}
        labelWidth="140px"
        text={draft.batteryLevel?.toString() ?? ''}
        textProps={{
          textAlign: 'start',
          paddingLeft: '50',
          paddingTop: '4',
          paddingBottom: '4',
        }}
        labelProps={{ sx: { padding: '4', textAlign: 'end' } }}
        sensorStyle={true}
      />
      <TextWithLabelRow
        label={t('label.last-recording-value')}
        labelWidth="140px"
        text={
          draft.latestTemperatureLog?.nodes[0]?.temperature.toString() ?? ''
        }
        textProps={{
          textAlign: 'start',
          paddingLeft: '50',
          paddingTop: '4',
          paddingBottom: '4',
        }}
        labelProps={{ sx: { padding: '4', textAlign: 'end' } }}
        sensorStyle={true}
      />
      <TextWithLabelRow
        label={t('label.last-record')}
        labelWidth="140px"
        text={draft.latestTemperatureLog?.nodes[0]?.datetime ?? ''}
        textProps={{
          textAlign: 'start',
          paddingLeft: '50',
          paddingTop: '4',
          paddingBottom: '4',
        }}
        labelProps={{ sx: { padding: '4', textAlign: 'end' } }}
        sensorStyle={true}
      />
    </Grid>
  );
};
