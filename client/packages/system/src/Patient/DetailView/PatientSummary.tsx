import React, { FC } from 'react';
import {
  AppBarContentPortal,
  Box,
  useTranslation,
  Stack,
  LocaleKey,
  Typography,
  useFormatDateTime,
  DateUtils,
  Formatter,
} from '@openmsupply-client/common';
import { usePatient } from '../api';

const SummaryRow = ({ label, value }: { label: LocaleKey; value: string }) => {
  const t = useTranslation('patients');
  return (
    <Box gap={1} display="flex">
      <Box style={{ textAlign: 'start', width: 100 }}>
        <Typography sx={{ fontWeight: 'bold' }}>{t(label)}:</Typography>
      </Box>
      <Box flex={1}>
        <Typography>{value}</Typography>
      </Box>
    </Box>
  );
};

export const PatientSummary: FC = () => {
  const patientId = usePatient.utils.id();
  const { data } = usePatient.document.get(patientId);
  const { localisedDate } = useFormatDateTime();
  const formatDateOfBirth = (dateOfBirth: string | null) => {
    const dob = DateUtils.getDateOrNull(dateOfBirth);

    return !dob ? '' : `${localisedDate(dob)} (${DateUtils.age(dob)})`;
  };

  return (
    <AppBarContentPortal sx={{ display: 'flex', flex: 1, marginBottom: 1 }}>
      <Stack>
        <SummaryRow label="label.patient-id" value={String(data?.id ?? '')} />
        <SummaryRow
          label="label.gender"
          value={Formatter.sentenceCase(String(data?.gender ?? ''))}
        />
        <SummaryRow
          label="label.date-of-birth"
          value={formatDateOfBirth(data?.dateOfBirth ?? null)}
        />
      </Stack>
    </AppBarContentPortal>
  );
};
