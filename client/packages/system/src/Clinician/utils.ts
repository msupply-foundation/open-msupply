import { ClinicianFragment } from 'packages/programs/src';

export type ClinicianAutocompleteOption = {
  label: string;
  value?: Clinician;
};

export type Clinician = Pick<
  ClinicianFragment,
  'firstName' | 'lastName' | 'id'
>;
