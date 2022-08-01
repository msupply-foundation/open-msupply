import React, { FC, useMemo } from 'react';
import {
  BaseDatePickerInput,
  BufferedTextInput,
  InputWithLabelRow,
  Select,
  Stack,
  useFormatDateTime,
  useTranslation,
} from '@openmsupply-client/common';
import { Gender, useCreatePatientStore } from '../hooks';
import { PatientPanel } from './PatientPanel';

export const PatientFormTab: FC<PatientPanel> = ({ patient, value }) => {
  const { updatePatient } = useCreatePatientStore();
  const t = useTranslation('patients');

  const genderOptions = useMemo(
    () =>
      Object.keys(Gender).map(key => ({
        label: key,
        value: key,
      })),
    []
  );
  const dateFormatter = useFormatDateTime().customDate;

  return (
    <PatientPanel value={value} patient={patient}>
      <Stack spacing={2}>
        <InputWithLabelRow
          label={t('label.id')}
          Input={
            <BufferedTextInput
              size="small"
              sx={{ width: 250 }}
              value={patient?.code ?? ''}
              onChange={event => updatePatient({ code: event.target.value })}
              autoFocus
            />
          }
        />
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
        <InputWithLabelRow
          label={t('label.date-of-birth')}
          Input={
            <BaseDatePickerInput
              // undefined is displayed as "now" and null as unset
              value={patient?.dateOfBirth ?? null}
              onChange={event => {
                if (event)
                  updatePatient({
                    dateOfBirth: dateFormatter(event, 'yyyy-MM-dd'),
                  });
              }}
              inputFormat="dd/MM/yyyy"
              disableFuture
            />
          }
        />
        <InputWithLabelRow
          label={t('label.gender')}
          Input={
            <Select
              sx={{ minWidth: 100 }}
              options={genderOptions}
              value={patient?.gender}
              onChange={event =>
                updatePatient({ gender: event.target.value as Gender })
              }
            />
          }
        />
      </Stack>
    </PatientPanel>
  );
};
