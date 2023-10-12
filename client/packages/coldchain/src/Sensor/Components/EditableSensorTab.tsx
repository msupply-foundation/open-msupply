import React, { FC } from 'react';
import { SensorFragment } from '../api';
import { Grid } from '@mui/material';
import {
  BasicTextInput,
  InputWithLabelRow,
  InputWithLabelRowProps,
} from '@common/components';

import { LocationSearchInput } from '@openmsupply-client/system/src';
import { useTranslation } from '@common/intl';

const StyledInputRow = ({ label, Input }: InputWithLabelRowProps) => (
  <InputWithLabelRow
    label={label}
    Input={Input}
    labelProps={{ sx: { textAlign: 'end', padding: '4' } }}
    labelWidth="140px"
    sx={{
      padding: '4',
      gap: '46px',
      '.MuiFormControl-root > .MuiInput-root, > input': {
        maxWidth: '200px',
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
  const t = useTranslation('coldchain');
  return (
    <Grid>
      <StyledInputRow
        label={t('label.sensor-name')}
        Input={
          <BasicTextInput
            value={draft.name ?? ''}
            onChange={e => onUpdate({ name: e.target.value })}
          />
        }
      />
      <InputWithLabelRow
        label={t('label.storage-location')}
        labelWidth="140px"
        labelProps={{ sx: { textAlign: 'end', padding: '4' } }}
        sx={{
          padding: '4',
          gap: '46px',
          '.MuiFormControl-root > .MuiInput-root, > input': {
            maxWidth: '180px',
          },
        }}
        Input={
          <LocationSearchInput
            value={draft.location ?? null}
            onChange={location => {
              onUpdate({ location });
            }}
            disabled={false}
            width={'200'}
            allowUnassign={true}
          ></LocationSearchInput>
        }
      />
    </Grid>
  );
};
