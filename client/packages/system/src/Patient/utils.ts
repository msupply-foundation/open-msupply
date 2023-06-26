import {
  FilterOptionsState,
  Formatter,
  LocaleKey,
  RegexUtils,
  TypedTFunction,
} from '@openmsupply-client/common';
import { PatientRowFragment } from './api';

export interface NameSearchProps {
  open: boolean;
  onClose: () => void;
  onChange: (name: PatientRowFragment) => void;
}

export interface NameSearchInputProps {
  onChange: (name: PatientRowFragment) => void;
  width?: number;
  value: PatientRowFragment | null;
  disabled?: boolean;
}

export const basicFilterOptions = {
  stringify: (name: PatientRowFragment) => `${name.code} ${name.name}`,
  limit: 100,
};

export const filterByNameAndCode = (
  options: PatientRowFragment[],
  state: FilterOptionsState<PatientRowFragment>
) =>
  options.filter(option =>
    RegexUtils.matchObjectProperties(state.inputValue, option, ['name', 'code'])
  );

export const patientsToCsv = (
  invoices: PatientRowFragment[],
  t: TypedTFunction<LocaleKey>
) => {
  const fields: string[] = [
    'id',
    t('label.code'),
    t('label.first-name'),
    t('label.last-name'),
    t('label.date-of-birth'),
  ];

  const data = invoices.map(node => [
    node.id,
    node.code,
    node.firstName,
    node.lastName,
    Formatter.csvDateString(node.dateOfBirth),
  ]);
  return Formatter.csv({ fields, data });
};
