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

export const isExistingCode = (
  clinicians: ClinicianFragment[],
  code: string
): boolean =>
  clinicians.some(
    clinician => clinician.code.toUpperCase() === code.toUpperCase()
  );
