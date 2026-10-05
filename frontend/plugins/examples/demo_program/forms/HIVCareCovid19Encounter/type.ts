/*
 * A deployed document type taken over by the plugin
 * (kdd/custom-forms/implementation-plan.md § From review, P4): a deployment's
 * HIV Care COVID-19 vaccination encounter, as its schema repository defines
 * it. Two changes from that file, neither of which changes the schema: `Encounter` comes from the SDK (its base type field for field), and
 * the manufacturer is a union of strings, because the plugin tsconfig's
 * `erasableSyntaxOnly` refuses an `enum`. `pnpm forms:emit` generates from it
 * exactly the schema the deployment holds, which is the type's v1, installed
 * under the deployment's own schema id (`forms.json`).
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

export type Covid19Manufacture =
  | 'Moderna'
  | 'Pfizer'
  | 'Astra-Zeneca'
  | 'Sinovac'
  | 'Johnson & Johnson'
  | 'Novavax'
  | 'Other';

export interface Covid19EncounterExt {
  clientOfferedVaccination?: boolean;
  declined?: boolean;
  reasonForDecline?: string;
  manufacturer?: Covid19Manufacture;
  /**
   * @format date
   */
  vaccinationDate?: string;
  batchNumber?: string;
}

export interface Covid19Encounter extends Encounter {
  extension?: Covid19EncounterExt;
}
