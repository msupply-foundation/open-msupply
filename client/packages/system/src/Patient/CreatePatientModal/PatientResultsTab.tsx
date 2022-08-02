import React, { FC, useEffect } from 'react';
import {
  BasicSpinner,
  DataTable,
  GenderInput,
  Typography,
  useColumns,
  useTranslation,
} from '@openmsupply-client/common';
import { PatientPanel } from './PatientPanel';
import { usePatient } from '../api';
import { Gender, usePatientCreateStore } from '../hooks';
import { PatientFragment } from '../api/operations.generated';

export const PatientResultsTab: FC<PatientPanel> = ({ patient, value }) => {
  const { mutate, isLoading, data } = usePatient.utils.search();
  const { updatePatient } = usePatientCreateStore();
  const t = useTranslation('patients');

  const columns = useColumns<PatientFragment>([
    {
      key: 'firstName',
      label: 'label.first-name',
    },
    {
      key: 'lastName',
      label: 'label.last-name',
    },
    {
      key: 'dateOfBirth',
      label: 'label.date-of-birth',
    },
  ]);

  useEffect(() => {
    if (!isLoading && !!patient && !data && !!patient.canSearch) {
      const { code, firstName, lastName, dateOfBirth, gender } = patient;
      mutate({
        code,
        firstName,
        lastName,
        dateOfBirth,
        gender: gender
          ? ((GenderInput as Record<Gender, string>)[gender] as GenderInput)
          : undefined,
      });
    }
  }, [patient, isLoading, data]);

  useEffect(() => {
    updatePatient({ canCreate: true });
  }, [data]);

  if (!patient?.canSearch) {
    return null;
  }

  if (isLoading) {
    return <BasicSpinner />;
  }

  const count = data?.length ?? 0;

  return (
    <PatientPanel value={value} patient={patient}>
      {count > 0 && (
        <Typography component="div" style={{ fontWeight: 700 }}>
          {t('messages.patients-found', { count })}
        </Typography>
      )}
      <DataTable
        dense
        key="create-patient-duplicates"
        data={data?.map(node => node.patient)}
        columns={columns}
        noDataMessage={t('messages.no-matching-patients')}
      />
    </PatientPanel>
  );
};
