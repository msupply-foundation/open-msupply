import React, { FC } from 'react';
import {
  BufferedTextInput,
  InputWithLabelRow,
  Stack,
  Typography,
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
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
          {t('heading.patient-details')}
        </Typography>
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
