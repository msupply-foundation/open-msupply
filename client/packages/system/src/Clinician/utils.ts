import { ClinicianFragment } from '@openmsupply-client/programs';

export type ClinicianAutocompleteOption = {
  label: string;
  value: Clinician;
};

export type Clinician = Pick<
  ClinicianFragment,
  'firstName' | 'lastName' | 'id'
>;
