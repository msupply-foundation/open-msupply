import React, { FC, useEffect } from 'react';
import {
  BasicSpinner,
  DataTable,
  Typography,
  useColumns,
  useTranslation,
} from '@openmsupply-client/common';
import { PatientPanel } from './PatientPanel';
import { usePatient } from '../api';
import { useCreatePatientStore } from '../hooks';
import { PatientFragment } from '../api/operations.generated';

export const PatientResultsTab: FC<PatientPanel> = ({ patient, value }) => {
  const { mutateAsync, isLoading, data } = usePatient.utils.search();
  const { updatePatient } = useCreatePatientStore();
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
      const { firstName, lastName } = patient;
      mutateAsync({ firstName, lastName });
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
        data={data?.map(node => node.patient)}
        columns={columns}
        noDataMessage={t('messages.no-matching-patients')}
      />
    </PatientPanel>
  );
};
