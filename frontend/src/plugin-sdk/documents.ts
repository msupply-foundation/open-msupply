/*
 * The base document types a form plugin extends (kdd/custom-forms/specs.md
 * § Authoring): the shapes every Patient, ProgramEnrolment, Encounter and
 * ContactTrace document shares, which the server reads base fields from. A
 * plugin's document type is an interface extending one of these with its own
 * fields under `extension.<programKey>`, and its JSON Schema is emitted from
 * that interface at build (scripts/emit-form-schemas.mjs).
 *
 * They match the programschemas repo's `document.ts`, `patient.ts`,
 * `program_enrolment.ts`, `encounter.ts` and `contact_trace.ts` field for
 * field and JSDoc for JSDoc, so a schema emitted from these carries the same
 * definitions the deployed JSON Forms schemas do. Two rules follow from the
 * schema being generated from this file:
 *
 *   - The JSDoc blocks are schema content, not commentary:
 *     ts-json-schema-generator turns the text into `description` and the
 *     `@format` tags into `format`, and where a property carries several
 *     blocks the last one wins. Editing one changes every schema emitted
 *     from a type that reaches it. Commentary that must stay out of the
 *     schema is a `//` comment.
 *   - Enumerations are string-literal unions, never TS `enum`s (the plugin
 *     tsconfig sets `erasableSyntaxOnly`). A union emits the same
 *     `{ type: 'string', enum: [...] }` definition a string enum would.
 *
 * Type-only: nothing here exists at runtime, so the SDK barrel re-exports it
 * with `export type` and it adds nothing to the eager bundle.
 */

// ── Shared base ─────────────────────────────────────────────────────────────

export interface DocumentData {
  extension?: object;
}

// ── Patient ─────────────────────────────────────────────────────────────────

/*
 * SNOMED codes per value, as the programschemas enum documented them:
 *   FEMALE              703118005 Feminine gender
 *   MALE                703117000 Masculine gender
 *   TRANSGENDER         either TRANSGENDER_MALE or TRANSGENDER_FEMALE
 *   TRANSGENDER_MALE    407379008 transgendered transsexual, female-to-male
 *   TRANSGENDER_FEMALE  407378000 Surgically transgendered transsexual,
 *                       male-to-female
 *   UNKNOWN             394743007 Gender unknown
 *   NON_BINARY          772004004 Non-binary gender
 */
export type Gender =
  | 'FEMALE'
  | 'MALE'
  | 'TRANSGENDER'
  | 'TRANSGENDER_MALE'
  | 'TRANSGENDER_MALE_HORMONE'
  | 'TRANSGENDER_MALE_SURGICAL'
  | 'TRANSGENDER_FEMALE'
  | 'TRANSGENDER_FEMALE_HORMONE'
  | 'TRANSGENDER_FEMALE_SURGICAL'
  | 'UNKNOWN'
  | 'NON_BINARY';

export interface Note {
  text: string;
  /**
   * Datetime when the note has been created
   *
   * @format date-time
   */
  created?: string;
  /**
   * authorId should be captured automatically from app state
   */
  authorId?: string;
  /**
   * Practitioner's "real" name.
   * Currently needs to be entered, but would ideally default to local state
   * (but we don't yet have this in the database)
   */
  authorName?: string;
}

export interface Person {
  /** mSupply Patient id */
  id?: string;

  /** Patient code, e.g. national id or other patient identifier */
  code?: string;
  /** Secondary patient code, e.g. another type of health id */
  code2?: string;

  /** 1601000122107 Passport Number */
  passportNumber?: string;

  firstName: string;
  middleName?: string;
  /** 184096005 Patient Surname */
  lastName: string;
  /** 184095009 Patient Forename */
  /** 263495000 Gender */
  /** 394744001 Gender unspecified*/
  gender?: Gender;
  /**
   * 184099003 Date of birth
   *
   * @format date
   */
  dateOfBirth?: string | null;
  /** Date of birth is estimated */
  dateOfBirthIsEstimated?: boolean;
  /** Place of birth */
  birthPlace?: Address;

  /** Person is deceased */
  isDeceased?: boolean;
  /**
   * Date of death
   *
   * @format date
   */
  dateOfDeath?: string;

  contactDetails?: ContactDetails[];
  socioEconomics?: SocioEconomics;

  notes?: Note[];

  phone?: string;

  nextOfKin?: NextOfKin;
}

export interface NextOfKin {
  /** mSupply Patient id of next of kin */
  id?: string;
  /** Next of kin name */
  name?: string;
}

export interface Address {
  /** 184097001 Patient Address */
  address1?: string;
  /** Second address line */
  address2?: string;
  /** 433178008 City of residence */
  city?: string;
  /** 184102003 Patient zip code */
  zipCode?: string;
  district?: string;
  /** Region or province */
  region?: string;
  country?: string;
}

export interface ContactDetails extends Address {
  /** Clemens e.g. home, work, etc */
  description?: string;

  /** 429697006 Patient home telephone number */
  phone?: string;
  /** 428481002 Patient mobile telephone number */
  mobile?: string;
  /** 424966008 Patient - email address */
  email?: string;
  website?: string;
}

export interface SocioEconomics {
  /** 224293004 Education received in the past */
  education?: string;
  employmentStatus?: string;
  /** 14679004 Occupation */
  occupation?: string;
  literate?: string;
}

export type MaritalStatus =
  | 'SINGLE'
  | 'MARRIED'
  | 'DIVORCED'
  | 'WIDOWED'
  | 'SEPARATED'
  | 'REGISTERED_PARTNERSHIP';

export interface RelatedPerson extends Person {
  /**
   * Can be used to group or mark a person entry. For example, nextOfKin |
   * caregiver | mother
   */
  category?: string;
  /** Relationship with the patient, e.g. mother, brother, cousin, friend...*/
  relationship?: string;
}

export interface DrugAllergy {
  /** The drug name */
  drug?: string;
  /** Description of the allergy. */
  description?: string;
}

export interface Allergies {
  /** Allergy again struct */
  drugAllergies: DrugAllergy[];
}

export interface Patient extends Person, DocumentData {
  /**
   * Medical record number
   *
   * 398225001
   */
  id: string;

  allergies?: Allergies;

  /** 125680007 Marital Status */
  maritalStatus?: MaritalStatus;

  contacts?: RelatedPerson[];
}

// ── Program enrolment ───────────────────────────────────────────────────────

export interface ProgramEnrolmentStatus {
  status: string;
  /**
   * Date and time when the status become valid
   *
   * @format date-time
   */
  datetime: string;
  comment?: string;
}

export interface ProgramEnrolment extends DocumentData {
  /**
   * Enrolment date and time
   *
   * @format date-time
   */
  enrolmentDatetime: string;

  /**
   * Patient's program id
   */
  programEnrolmentId?: string;

  /**
   * Store ID of the facility where the patient was originally enrolled
   */
  storeId?: string;

  /**
   * An overall note for additional comments about the program enrolment
   */
  notes?: Note[];

  contacts?: RelatedPerson[];

  statusLog?: ProgramEnrolmentStatus[];
}

// ── Encounter ───────────────────────────────────────────────────────────────

export type EncounterStatus = 'PENDING' | 'VISITED' | 'CANCELLED' | 'DELETED';

export interface Clinician {
  id?: string;
  firstName?: string;
  lastName?: string;
}

// TO-DO: add firstName and lastName once the server records them for a user.
export interface User {
  id?: string;
  username?: string;
}

export interface EncounterLocation {
  // The omSupply store id (If encounter is at an omSupply store)
  storeId?: string;
}

export interface Encounter extends DocumentData {
  status?: EncounterStatus;

  /**
   * Date time when the encounter was made, e.g. when an clinician schedule
   * the encounter.
   *
   * @format date-time
   */
  createdDatetime: string;
  /**
   * User who created the encounter (could be different to "Clinician")
   */
  createdBy?: User;
  /**
   * Encounter start date and time
   *
   * @format date-time
   */
  startDatetime: string;
  /**
   * Encounter end date and time
   *
   * @format date-time
   */
  endDatetime?: string;

  clinician?: Clinician;

  /**
   * The store/clinic/location of the encounter
   */
  location?: EncounterLocation;

  /**
   * An overall note for additional comments about the encounter
   */
  notes?: Note[];
}

// ── Contact trace ───────────────────────────────────────────────────────────

export interface ContactTraceLocation {
  // The omSupply store id (If contact trace is at an omSupply store)
  storeId?: string;
}

/** Contact tracing information for a contact associated with a patient. */
export interface ContactTrace extends DocumentData {
  /**
   * Date and time of when the contact trace is recorded
   *
   * @format date-time
   */
  datetime: string;

  contactTraceId?: string;

  /**
   * Person details about the contact in this contact trace
   */
  contact?: RelatedPerson;

  /**
   * The store/clinic/location of the contact trace
   */
  location?: ContactTraceLocation;

  notes?: Note[];
}
