import { ClinicianFragment } from '@openmsupply-client/programs';

export type ClinicianAutocompleteOption = {
  id: string;
  label: string;
  value: Clinician;
};

export type Clinician = Pick<
  ClinicianFragment,
  'firstName' | 'lastName' | 'id'
>;
