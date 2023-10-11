import React, { FC } from 'react';
import { SensorFragment } from '../api';
import { Grid } from '@mui/material';
import {
  BasicTextInput,
  InputWithLabelRow,
  InputWithLabelRowProps,
} from '@common/components';

import { LocationSearchInput } from 'packages/system/src';

const StyledInputRow = ({ label, Input }: InputWithLabelRowProps) => (
  <InputWithLabelRow
    label={label}
    Input={Input}
    labelProps={{ sx: { textAlign: 'end', padding: '4' } }}
    labelWidth="100px"
    sx={{
      justifyContent: 'space-between',
      '.MuiFormControl-root > .MuiInput-root, > input': {
        maxWidth: '160px',
      },
    }}
  />
);

interface EditableSensorTabProps {
  draft: SensorFragment;
  onUpdate: (patch: Partial<SensorFragment>) => void;
}

export const EditableSensorTab: FC<EditableSensorTabProps> = ({
  draft,
  onUpdate,
}) => {
  return (
    <Grid
      display="flex"
      flexDirection={'column'}
      flex={1}
      container
      paddingTop={2}
      paddingBottom={2}
      width="100%"
    >
      <StyledInputRow
        label={'name'}
        Input={
          <BasicTextInput
            value={draft.name ?? ''}
            onChange={e => onUpdate({ name: e.target.value })}
          />
        }
      />
      <InputWithLabelRow
        label={'Storage Location'}
        labelWidth="100%"
        Input={
          <LocationSearchInput
            value={draft.location ?? null}
            onChange={location => {
              onUpdate({ location });
            }}
            disabled={false}
            width={'100%'}
            allowUnassign={true}
          ></LocationSearchInput>
        }
      />
    </Grid>
  );
};
