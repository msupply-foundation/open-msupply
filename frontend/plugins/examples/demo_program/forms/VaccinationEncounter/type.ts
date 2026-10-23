/*
 * A deployed document type taken over by the plugin
 * (kdd/custom-forms/implementation-plan.md § From review, P4): an illustrative
 * deployment's vaccination encounter, written as a type copied from a
 * deployment's schema repository is: `Encounter` comes from the SDK (its base
 * type field for field), and the manufacturer is a union of strings, because
 * the plugin tsconfig's `erasableSyntaxOnly` refuses an `enum`. The deployed schema is v1,
 * installed under the deployment's own schema id (`forms.json`) and generated
 * from the archived v1.ts, which the build re-proves on every run; this type
 * is the plugin's v2.
 *
 * The fields sit directly under `extension`, where the deployment's documents
 * have them, not under the plugin's `extension.demo`.
 *
 * v2 is additive, so it needs no migration and v1 documents open in the
 * current form as they are: it adds `batchNumber` and the `Novavax`
 * manufacturer. The old client keeps drawing the form from the deployment's
 * UI schema, which is not extended, so it lists Novavax (its options come from
 * the schema) but shows no batch number.
 */
import type { Encounter } from '@openmsupply/plugin-sdk';

export type VaccineManufacturer =
  | 'Moderna'
  | 'Pfizer'
  | 'Astra-Zeneca'
  | 'Sinovac'
  | 'Johnson & Johnson'
  | 'Novavax'
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
  batchNumber?: string;
}

export interface VaccinationEncounter extends Encounter {
  extension?: VaccinationEncounterExt;
}
