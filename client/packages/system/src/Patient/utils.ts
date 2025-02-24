import {
  AutocompleteOptionRenderer,
  FilterOptionsState,
  Formatter,
  LocaleKey,
  RegexUtils,
  SxProps,
  TypedTFunction,
} from '@openmsupply-client/common';
import { PatientRowFragment } from './api';

export interface NameSearchProps {
  open: boolean;
  onClose: () => void;
  onChange: (name: SearchInputPatient) => void;
}

export interface SearchInputPatient {
  id: string;
  name: string;
  code: string;
  isDeceased: boolean;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
}

export interface NameSearchInputProps {
  onChange: (name: SearchInputPatient) => void;
  width?: number;
  value: SearchInputPatient | null;
  disabled?: boolean;
  sx?: SxProps;
  NoOptionsRenderer?: AutocompleteOptionRenderer<SearchInputPatient>;
}

export interface PatientSearchModalProps {
  open: boolean;
  onClose: () => void;
  onChange: (name: SearchInputPatient) => void;
  openPatientModal: () => void;
}

export const basicFilterOptions = {
  stringify: (name: SearchInputPatient) => `${name.code} ${name.name}`,
  limit: 100,
};

export const filterByNameAndCode = (
  options: SearchInputPatient[],
  state: FilterOptionsState<SearchInputPatient>
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
