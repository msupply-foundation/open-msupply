import React, { FC, useEffect } from 'react';
import {
  BasicSpinner,
  DataTable,
  GenderInput,
  Typography,
  useColumns,
  useFormatDateTime,
  useNavigate,
  useTranslation,
} from '@openmsupply-client/common';
import { PatientPanel } from './PatientPanel';
import { usePatient } from '../api';
import { Gender, usePatientCreateStore } from '@openmsupply-client/programs';
import { PatientFragment } from '../api/operations.generated';

const genderToGenderInput = (gender: Gender): GenderInput => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const exhaustiveCheck = (_: never): GenderInput => {
    return GenderInput.Male; // never returned
  };
  switch (gender) {
    case Gender.MALE:
      return GenderInput.Male;
    case Gender.FEMALE:
      return GenderInput.Female;
    case Gender.TRANSGENDER_MALE:
      return GenderInput.TransgenderMale;
    case Gender.TRANSGENDER_FEMALE:
      return GenderInput.TransgenderFemale;
    case Gender.UNKNOWN:
      return GenderInput.Unknown;
    case Gender.NON_BINARY:
      return GenderInput.NonBinary;
    default:
      return exhaustiveCheck(gender);
  }
};

export const PatientResultsTab: FC<PatientPanel> = ({ patient, value }) => {
  const { mutate, isLoading, data } = usePatient.utils.search();
  const { setNewPatient, updatePatient } = usePatientCreateStore();
  const t = useTranslation('patients');
  const navigate = useNavigate();
  const { localisedDate } = useFormatDateTime();

  const columns = useColumns<PatientFragment>([
    {
      key: 'code',
      label: 'label.patient-id',
    },
    {
      key: 'code2',
      label: 'label.patient-nuic',
    },
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
      formatter: dateString =>
        dateString ? localisedDate((dateString as string) || '') : '',
    },
    {
      key: 'gender',
      label: 'label.gender',
    },
    {
      key: 'isDeceased',
      label: 'label.deceased',
    },
  ]);

  useEffect(() => {
    if (!isLoading && !!patient && !data && !!patient.canSearch) {
      const { code, code2, firstName, lastName, dateOfBirth, gender } = patient;
      mutate({
        code,
        code2,
        firstName,
        lastName,
        dateOfBirth,
        gender: gender ? genderToGenderInput(gender) : undefined,
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
      <Typography component="div" fontSize={12}>
        {t('messages.patients-create', { count })}
      </Typography>
      <DataTable
        dense
        id="create-patient-duplicates"
        data={data?.map(node => node.patient)}
        columns={columns}
        noDataMessage={t('messages.no-matching-patients')}
        onRowClick={row => {
          setNewPatient(undefined);
          navigate(String(row.id));
        }}
        generateRowTooltip={({ firstName, lastName }) =>
          t('messages.click-to-view', { firstName, lastName })
        }
      />
    </PatientPanel>
  );
};
