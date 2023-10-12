import React, { FC } from 'react';
import { SensorFragment } from '../api';
import { Grid, TextWithLabelRow } from 'packages/common/src';

interface NonEditableSensorTabProps {
  draft: SensorFragment;
}

export const NonEditableSensorTab: FC<NonEditableSensorTabProps> = ({
  draft,
}) => {
  return (
    <Grid container display="flex" flex={1} flexDirection="column" gap={1}>
      <TextWithLabelRow
        label={'CCE'}
        labelWidth="140px"
        text={''}
        textProps={{
          textAlign: 'start',
          paddingLeft: '50',
          paddingTop: '4',
          paddingBottom: '4',
        }}
        labelProps={{ sx: { padding: '4', textAlign: 'end' } }}
      />
      <TextWithLabelRow
        label={'Serial Number'}
        labelWidth="140px"
        text={draft.serial ?? ''}
        textProps={{
          textAlign: 'start',
          paddingLeft: '50',
          paddingTop: '4',
          paddingBottom: '4',
        }}
        labelProps={{ sx: { padding: '4', textAlign: 'end' } }}
      />
      <TextWithLabelRow
        label={'Battery Level'}
        labelWidth="140px"
        text={draft.batteryLevel?.toString() ?? ''}
        textProps={{
          textAlign: 'start',
          paddingLeft: '50',
          paddingTop: '4',
          paddingBottom: '4',
        }}
        labelProps={{ sx: { padding: '4', textAlign: 'end' } }}
      />
      <TextWithLabelRow
        label={'Last temperature recording value'}
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
      />
      <TextWithLabelRow
        label={'Last recording date / time'}
        labelWidth="140px"
        text={draft.latestTemperatureLog?.nodes[0]?.datetime ?? ''}
        textProps={{
          textAlign: 'start',
          paddingLeft: '50',
          paddingTop: '4',
          paddingBottom: '4',
        }}
        labelProps={{ sx: { padding: '4', textAlign: 'end' } }}
      />
    </Grid>
  );
};
