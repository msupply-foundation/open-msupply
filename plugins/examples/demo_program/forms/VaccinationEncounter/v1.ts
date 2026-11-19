/*
 * The deployment's vaccination encounter as schema version 1 was generated
 * from it: an ARCHIVED type. v1.json is the deployment's own
 * schema, installed under its own id (`forms.json`), so it is frozen; this
 * type exists so the build proves on every run that it still regenerates
 * exactly that file. The names match the deployed schema's definitions, which
 * the generator takes from them. Never change it: a changed type is a new
 * version, against type.ts.
 */
import type { Encounter } from '@openmsupply/plugin-sdk';

export type VaccineManufacturer =
  | 'Moderna'
  | 'Pfizer'
  | 'Astra-Zeneca'
  | 'Sinovac'
  | 'Johnson & Johnson'
  | 'Other';

export interface VaccinationEncounterExt {
  clientOfferedVaccination?: boolean;
  declined?: boolean;
  reasonForDecline?: string;
  manufacturer?: VaccineManufacturer;
  /**
   * @format date
   */
  vaccinationDate?: string;
}

export interface VaccinationEncounter extends Encounter {
  extension?: VaccinationEncounterExt;
}
