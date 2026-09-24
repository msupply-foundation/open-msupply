/*
 * The demo follow-up encounter as schema version 1 was generated from it —
 * an ARCHIVED type. v1.json is frozen: the emit script never regenerates it,
 * and this type exists so a build check can prove it still regenerates
 * exactly that file, and so the archived v1 form has the type its documents
 * were written against. Change it only together with a new schema version,
 * never in place.
 *
 * The JSDoc blocks are schema content: ts-json-schema-generator emits them as
 * `description` and `@format` (scripts/emit-form-schemas.mjs).
 */
import type { Encounter } from '@openmsupply/plugin-sdk';

export type DemoRegimenV1 = 'FIRST_LINE' | 'SECOND_LINE' | 'LEGACY_TRIAL';

export interface DemoEncounterV1Extension {
  /** Weight in kilograms */
  weightKg?: number;
  /** Height in centimetres */
  heightCm?: number;
  /** The regimen the patient is on after this visit */
  regimen?: DemoRegimenV1;
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

export interface DemoEncounterV1 extends Encounter {
  extension?: {
    demo?: DemoEncounterV1Extension;
  };
}
