import React, { FC } from 'react';
import {
  BufferedTextInput,
  InputWithLabelRow,
  Stack,
  useTranslation,
} from '@openmsupply-client/common';
import { useCreatePatientStore } from '../hooks';
import { PatientPanel } from './PatientPanel';

export const PatientFormTab: FC<PatientPanel> = ({ patient, value }) => {
  const { updatePatient } = useCreatePatientStore();
  const t = useTranslation('patients');

  return (
    <PatientPanel value={value} patient={patient}>
      <Stack spacing={2}>
        <InputWithLabelRow
          label={t('label.first-name')}
          Input={
            <BufferedTextInput
              size="small"
              sx={{ width: 250 }}
              value={patient?.firstName ?? ''}
              onChange={event =>
                updatePatient({ firstName: event.target.value })
              }
              autoFocus
            />
          }
        />
        <InputWithLabelRow
          label={t('label.last-name')}
          Input={
            <BufferedTextInput
              size="small"
              sx={{ width: 250 }}
              value={patient?.lastName ?? ''}
              onChange={event =>
                updatePatient({ lastName: event.target.value })
              }
            />
          }
        />
      </Stack>
    </PatientPanel>
  );
};
