/*
 * The demo program's follow-up encounter, schema version 2 (the current
 * one): the base Encounter plus the program's own fields under
 * `extension.demo`.
 *
 * Against version 1 (./v1.ts) this is a breaking change: weight and height
 * sit under `vitals`, and the `LEGACY_TRIAL` regimen is retired. Version 1
 * documents stay pinned to their own schema, which is why v1.json is kept.
 *
 * The JSDoc blocks are schema content: ts-json-schema-generator emits them as
 * `description` and `@format` (scripts/emit-form-schemas.mjs).
 */
import type { Encounter } from '@openmsupply/plugin-sdk';

export type DemoRegimen = 'FIRST_LINE' | 'SECOND_LINE';

export interface DemoVitals {
  /** Weight in kilograms */
  weightKg?: number;
  /** Height in centimetres */
  heightCm?: number;
}

export interface DemoEncounterExtension {
  vitals?: DemoVitals;
  /** The regimen the patient is on after this visit */
  regimen?: DemoRegimen;
  // A date-time, not a date: the Schedule rules in events.json read this
  // field as RFC 3339, and the server falls back to the encounter's start for
  // any value that does not parse as one.
  /**
   * Date and time of the next follow-up visit
   *
   * @format date-time
   */
  nextVisit?: string;
  /** Free-text notes about the visit */
  notes?: string;
}

export interface DemoEncounter extends Encounter {
  extension?: {
    demo?: DemoEncounterExtension;
  };
}
