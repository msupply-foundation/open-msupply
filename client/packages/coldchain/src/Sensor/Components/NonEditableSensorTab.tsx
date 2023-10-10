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
    <Grid
      flexDirection={'column'}
      flex={1}
      container
      paddingTop={2}
      paddingBottom={2}
      width="100%"
    >
      <TextWithLabelRow
        label={'Serial Number'}
        text={draft.serial ?? ''}
        textProps={{ textAlign: 'end' }}
      />
      <TextWithLabelRow
        label={'Battery Level'}
        text={draft.batteryLevel?.toString() ?? ''}
        textProps={{ textAlign: 'end' }}
      />
      <TextWithLabelRow
        label={'Last temperature recording value'}
        text={
          draft.latestTemperatureLog?.nodes[0]?.temperature.toString() ?? ''
        }
        textProps={{ textAlign: 'end' }}
      />
      <TextWithLabelRow
        label={'Last recording date / time'}
        text={draft.latestTemperatureLog?.nodes[0]?.datetime ?? ''}
        textProps={{ textAlign: 'end' }}
      />
      <TextWithLabelRow
        label={'CCE'}
        text={''}
        textProps={{ textAlign: 'end' }}
      />
    </Grid>
  );
};
