import { t, localisedDate } from '../../../intl';
import { toCsv } from '../../../domain/reportFiles';
import { genderLabel } from '../../../domain/patient';
import type { PatientsResult } from './patients.generated';

type PatientRow = PatientsResult['patients']['nodes'][number];

// The patient list → CSV (spec/patients S1 "Export CSV"). Columns match the
// list's visible fields; headers are translated, dates localised, gender via the
// fixed gender labels, booleans Yes/No. Feeds a direct .csv download or the
// server's csvToExcel conversion (domain/reportFiles).
export const patientsToCsv = (rows: PatientRow[]): string => {
  const fields = [
    t('label.patient-id'),
    t('label.patient-nuic'),
    t('label.created'),
    t('label.first-name'),
    t('label.last-name'),
    t('label.gender'),
    t('label.date-of-birth'),
    t('label.next-of-kin'),
    t('label.deceased'),
  ];
  const data = rows.map(row => [
    row.code,
    row.code2 ?? '',
    row.createdDatetime ? localisedDate(row.createdDatetime) : '',
    row.firstName ?? '',
    row.lastName ?? '',
    row.gender ? genderLabel(row.gender) : '',
    row.dateOfBirth ? localisedDate(row.dateOfBirth) : '',
    row.nextOfKinName ?? '',
    row.isDeceased ? t('messages.yes') : t('messages.no'),
  ]);
  return toCsv(fields, data);
};
